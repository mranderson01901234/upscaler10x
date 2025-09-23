class ProEngineDownloader {
	constructor(authService) {
		this.authService = authService;
		this.downloadUrl = '/download/pro-engine';
		this.version = '1.0.0';
	}

	async checkProEngineStatus() {
		if (!this.authService.isSignedIn()) {
			return { installed: false, eligible: false, reason: 'Not signed in' };
		}

		const profile = this.authService.getUserProfile();
		if (!profile || !['basic', 'pro'].includes(profile.subscription_tier)) {
			return { 
				installed: false, 
				eligible: false, 
				reason: 'Pro Engine requires Basic or Pro subscription',
				currentTier: profile?.subscription_tier || 'free'
			};
		}

		try {
			        const resp = await fetch('http://localhost:3007/api/pro-engine/status');
			if (resp.ok) {
				const status = await resp.json();
				return {
					installed: true,
					eligible: true,
					version: status.version,
					aiModelsLoaded: status.aiModelsLoaded,
					lastVerified: status.lastVerified
				};
			}
		} catch (_) {}

		return { installed: false, eligible: true, reason: 'Pro Engine not installed' };
	}

	async downloadProEngine(progressCallback) {
		try {
			const { data: { session } } = await this.authService.supabase.auth.getSession();
			const userToken = session?.access_token;

			const response = await fetch(this.downloadUrl, {
				headers: {
					'Authorization': `Bearer ${userToken}`
				}
			});
			if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);

			const contentLengthHeader = response.headers.get('content-length');
			const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;
			const reader = response.body.getReader();
			let received = 0;
			const chunks = [];
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value);
				received += value.length;
				if (progressCallback && contentLength) {
					progressCallback({ loaded: received, total: contentLength, percent: Math.round((received / contentLength) * 100) });
				}
			}
			const blob = new Blob(chunks, { type: 'application/zip' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `pro-upscaler-engine-v${this.version}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			return { success: true, fileName: a.download };
		} catch (error) {
			console.error('Pro Engine download failed:', error);
			throw error;
		}
	}

	showDownloadPrompt() {
		return `
			<div class="pro-engine-prompt">
				<h3>Unlock Maximum Performance</h3>
				<p>Download Pro Engine for faster AI processing:</p>
				<ul>
					<li>Up to 3x faster AI enhancement</li>
					<li>Local processing - no data leaves your device</li>
					<li>Larger file support</li>
					<li>Priority processing queue</li>
				</ul>
				<p class="file-info">Download size: 609MB • One-time installation</p>
				<div class="download-actions">
					<button id="download-pro-engine" class="download-button">Download Pro Engine</button>
					<button id="skip-pro-engine" class="skip-button">Skip for now</button>
				</div>
			</div>
		`;
	}
}

window.ProEngineDownloader = ProEngineDownloader; 