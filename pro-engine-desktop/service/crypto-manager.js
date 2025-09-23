const crypto = require('crypto');
const fs = require('fs').promises;
const fssync = require('fs');
const path = require('path');

class ModelCryptoManager {
	constructor() {
		this.algorithm = 'aes-256-gcm';
		this.keyRotationInterval = 24 * 60 * 60 * 1000; // 24 hours
		this.modelsPath = path.join(__dirname, 'encrypted-models');
		this.decryptedCachePath = path.join(__dirname, 'temp-models');
	}

	// Ensure directories exist
	async ensureDirectories() {
		await fs.mkdir(this.modelsPath, { recursive: true });
		await fs.mkdir(this.decryptedCachePath, { recursive: true });
	}

	// Generate encryption key for distribution from env or fallback
	getDistributionKey() {
		const secret = process.env.MODEL_DISTRIBUTION_KEY || 'change-this-in-production';
		// Derive 32-byte key from secret
		return crypto.createHash('sha256').update(secret).digest();
	}

	// Generate decryption key from subscription data (used only for gating logic)
	generateDecryptionKey(userId, subscriptionTier, keyRotationEpoch) {
		const keyMaterial = `${userId}-${subscriptionTier}-${keyRotationEpoch}-pro-upscaler-v1`;
		return crypto.createHash('sha256').update(keyMaterial).digest();
	}

	// Get current key rotation epoch (changes daily)
	getCurrentKeyEpoch() {
		return Math.floor(Date.now() / this.keyRotationInterval);
	}

	// Encrypt model files for distribution (AES-256-GCM)
	async encryptModel(modelPath, outputPath) {
		try {
			await this.ensureDirectories();
			const modelData = await fs.readFile(modelPath);
			const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
			const key = this.getDistributionKey();
			const cipher = crypto.createCipheriv(this.algorithm, key, iv);

			const encrypted = Buffer.concat([cipher.update(modelData), cipher.final()]);
			const authTag = cipher.getAuthTag();
			const encryptedPackage = {
				iv: iv.toString('hex'),
				authTag: authTag.toString('hex'),
				data: encrypted.toString('hex'),
				version: '1.0',
				encrypted_at: Date.now()
			};

			await fs.writeFile(outputPath, JSON.stringify(encryptedPackage));
			return true;
		} catch (error) {
			console.error('Model encryption failed:', error);
			return false;
		}
	}

	// Decrypt model for active subscribers (cryptographic key is distribution key; subscription is gating)
	async decryptModel(encryptedPath, userId, subscriptionData) {
		try {
			await this.ensureDirectories();
			// Verify subscription is active
			if (!this.verifySubscriptionStatus(subscriptionData)) {
				throw new Error('Invalid subscription status');
			}

			const encryptedPackage = JSON.parse(await fs.readFile(encryptedPath, 'utf8'));
			const key = this.getDistributionKey();
			const iv = Buffer.from(encryptedPackage.iv, 'hex');
			const authTag = Buffer.from(encryptedPackage.authTag, 'hex');
			const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
			decipher.setAuthTag(authTag);

			let decrypted = Buffer.concat([
				decipher.update(Buffer.from(encryptedPackage.data, 'hex')),
				decipher.final()
			]);

			// Cache decrypted model temporarily
			const tempModelPath = path.join(
				this.decryptedCachePath,
				`model-${userId}-${Date.now()}.bin`
			);
			await fs.writeFile(tempModelPath, decrypted);
			return tempModelPath;
		} catch (error) {
			console.error('Model decryption failed:', error);
			return null;
		}
	}

	verifySubscriptionStatus(subscriptionData) {
		return (
			subscriptionData &&
			subscriptionData.tier &&
			['basic', 'pro'].includes(subscriptionData.tier) &&
			subscriptionData.status === 'active' &&
			new Date(subscriptionData.expires_at) > new Date()
		);
	}

	// Clean up temporary decrypted files
	async cleanupTempModels() {
		try {
			await this.ensureDirectories();
			const files = await fs.readdir(this.decryptedCachePath);
			const now = Date.now();
			for (const file of files) {
				if (file.startsWith('model-')) {
					const filePath = path.join(this.decryptedCachePath, file);
					const stats = await fs.stat(filePath);
					// Remove files older than 1 hour
					if (now - stats.mtime.getTime() > 60 * 60 * 1000) {
						await fs.unlink(filePath);
					}
				}
			}
		} catch (error) {
			console.error('Cleanup failed:', error);
		}
	}
}

module.exports = { ModelCryptoManager }; 