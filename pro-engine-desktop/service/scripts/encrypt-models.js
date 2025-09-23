#!/usr/bin/env node
const path = require('path');
const fs = require('fs');
const { ModelCryptoManager } = require('../crypto-manager');

(async () => {
	try {
		const buildDir = process.argv[2] || path.join(__dirname, '..');
		const modelsSrc = path.join(buildDir, 'models');
		const encryptedDir = path.join(buildDir, 'encrypted-models');
		if (!fs.existsSync(modelsSrc)) {
			console.log('No models directory found, skipping model encryption.');
			process.exit(0);
		}
		if (!fs.existsSync(encryptedDir)) fs.mkdirSync(encryptedDir, { recursive: true });
		const manager = new ModelCryptoManager();
		await manager.ensureDirectories();
		const candidates = fs.readdirSync(modelsSrc).filter(f => f.endsWith('.bin') || f.endsWith('.pth') || f.endsWith('.onnx'));
		for (const file of candidates) {
			const src = path.join(modelsSrc, file);
			const out = path.join(encryptedDir, file + '.enc');
			console.log(`Encrypting model: ${file}`);
			await manager.encryptModel(src, out);
		}
		console.log('Model encryption complete.');
		process.exit(0);
	} catch (e) {
		console.error('Encryption failed:', e);
		process.exit(1);
	}
})(); 