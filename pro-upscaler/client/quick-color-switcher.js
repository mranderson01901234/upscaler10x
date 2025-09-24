// Quick Color Scheme Switcher for Pro Upscaler
// Keeps the exact same layout, just changes colors

const colorSchemes = {
    'cool-gray': {
        name: '🔵 Cool Gray (Current)',
        colors: {
            '--background': '220 13% 4%',
            '--foreground': '220 13% 98%',
            '--card': '220 13% 7%',
            '--card-foreground': '220 13% 98%',
            '--popover': '220 13% 7%',
            '--popover-foreground': '220 13% 98%',
            '--primary': '217 91% 60%',
            '--primary-foreground': '220 13% 98%',
            '--secondary': '220 13% 13%',
            '--secondary-foreground': '220 13% 98%',
            '--muted': '220 13% 13%',
            '--muted-foreground': '220 9% 68%',
            '--accent': '220 13% 13%',
            '--accent-foreground': '220 13% 98%',
            '--destructive': '0 84% 60%',
            '--destructive-foreground': '220 13% 98%',
            '--border': '220 13% 20%',
            '--input': '220 13% 13%',
            '--ring': '217 91% 60%',
            '--success': '142 76% 36%',
            '--success-foreground': '220 13% 98%',
            '--warning': '48 96% 53%',
            '--warning-foreground': '220 13% 4%',
            '--error': '0 84% 60%',
            '--error-foreground': '220 13% 98%'
        }
    },
    'true-black': {
        name: '⚫ True Black',
        colors: {
            '--background': '0 0% 0%',
            '--foreground': '0 0% 100%',
            '--card': '0 0% 4%',
            '--card-foreground': '0 0% 100%',
            '--popover': '0 0% 4%',
            '--popover-foreground': '0 0% 100%',
            '--primary': '217 91% 60%',
            '--primary-foreground': '0 0% 100%',
            '--secondary': '0 0% 8%',
            '--secondary-foreground': '0 0% 100%',
            '--muted': '0 0% 8%',
            '--muted-foreground': '0 0% 65%',
            '--accent': '0 0% 8%',
            '--accent-foreground': '0 0% 100%',
            '--destructive': '0 84% 60%',
            '--destructive-foreground': '0 0% 100%',
            '--border': '0 0% 15%',
            '--input': '0 0% 8%',
            '--ring': '217 91% 60%',
            '--success': '142 76% 36%',
            '--success-foreground': '0 0% 100%',
            '--warning': '48 96% 53%',
            '--warning-foreground': '0 0% 0%',
            '--error': '0 84% 60%',
            '--error-foreground': '0 0% 100%'
        }
    },
    'vibrant-dark': {
        name: '🌈 Vibrant Dark',
        colors: {
            '--background': '240 10% 3%',
            '--foreground': '240 10% 98%',
            '--card': '240 10% 8%',
            '--card-foreground': '240 10% 98%',
            '--popover': '240 10% 8%',
            '--popover-foreground': '240 10% 98%',
            '--primary': '280 100% 70%',
            '--primary-foreground': '240 10% 98%',
            '--secondary': '240 10% 15%',
            '--secondary-foreground': '240 10% 98%',
            '--muted': '240 10% 15%',
            '--muted-foreground': '240 8% 75%',
            '--accent': '180 100% 50%',
            '--accent-foreground': '240 10% 98%',
            '--destructive': '0 84% 60%',
            '--destructive-foreground': '240 10% 98%',
            '--border': '240 10% 25%',
            '--input': '240 10% 15%',
            '--ring': '280 100% 70%',
            '--success': '120 100% 50%',
            '--success-foreground': '240 10% 98%',
            '--warning': '45 100% 60%',
            '--warning-foreground': '240 10% 3%',
            '--error': '340 100% 60%',
            '--error-foreground': '240 10% 98%'
        }
    },
    'semi-dark-bright': {
        name: '⚡ Semi-Dark Bright',
        colors: {
            '--background': '210 25% 12%',
            '--foreground': '210 25% 98%',
            '--card': '210 25% 18%',
            '--card-foreground': '210 25% 98%',
            '--popover': '210 25% 18%',
            '--popover-foreground': '210 25% 98%',
            '--primary': '195 100% 65%',
            '--primary-foreground': '210 25% 98%',
            '--secondary': '210 25% 25%',
            '--secondary-foreground': '210 25% 98%',
            '--muted': '210 25% 25%',
            '--muted-foreground': '210 15% 75%',
            '--accent': '300 100% 70%',
            '--accent-foreground': '210 25% 98%',
            '--destructive': '0 84% 60%',
            '--destructive-foreground': '210 25% 98%',
            '--border': '210 25% 35%',
            '--input': '210 25% 25%',
            '--ring': '195 100% 65%',
            '--success': '160 100% 60%',
            '--success-foreground': '210 25% 98%',
            '--warning': '35 100% 65%',
            '--warning-foreground': '210 25% 12%',
            '--error': '350 100% 70%',
            '--error-foreground': '210 25% 98%'
        }
    },
    'neon-dark': {
        name: '⚡ Neon Dark',
        colors: {
            '--background': '220 40% 2%',
            '--foreground': '220 40% 98%',
            '--card': '220 40% 6%',
            '--card-foreground': '220 40% 98%',
            '--popover': '220 40% 6%',
            '--popover-foreground': '220 40% 98%',
            '--primary': '300 100% 75%',
            '--primary-foreground': '220 40% 98%',
            '--secondary': '220 40% 12%',
            '--secondary-foreground': '220 40% 98%',
            '--muted': '220 40% 12%',
            '--muted-foreground': '220 25% 75%',
            '--accent': '180 100% 60%',
            '--accent-foreground': '220 40% 98%',
            '--destructive': '0 84% 60%',
            '--destructive-foreground': '220 40% 98%',
            '--border': '220 40% 20%',
            '--input': '220 40% 12%',
            '--ring': '300 100% 75%',
            '--success': '120 100% 65%',
            '--success-foreground': '220 40% 98%',
            '--warning': '60 100% 70%',
            '--warning-foreground': '220 40% 2%',
            '--error': '330 100% 70%',
            '--error-foreground': '220 40% 98%'
        }
    },
    'warm-vibrant': {
        name: '🔥 Warm Vibrant',
        colors: {
            '--background': '20 15% 5%',
            '--foreground': '20 15% 95%',
            '--card': '20 15% 12%',
            '--card-foreground': '20 15% 95%',
            '--popover': '20 15% 12%',
            '--popover-foreground': '20 15% 95%',
            '--primary': '25 95% 65%',
            '--primary-foreground': '20 15% 95%',
            '--secondary': '20 15% 18%',
            '--secondary-foreground': '20 15% 95%',
            '--muted': '20 15% 18%',
            '--muted-foreground': '20 10% 70%',
            '--accent': '45 95% 60%',
            '--accent-foreground': '20 15% 95%',
            '--destructive': '0 84% 60%',
            '--destructive-foreground': '20 15% 95%',
            '--border': '20 15% 25%',
            '--input': '20 15% 18%',
            '--ring': '25 95% 65%',
            '--success': '120 80% 55%',
            '--success-foreground': '20 15% 95%',
            '--warning': '35 95% 65%',
            '--warning-foreground': '20 15% 5%',
            '--error': '350 85% 65%',
            '--error-foreground': '20 15% 95%'
        }
    },
    'cool-vibrant': {
        name: '❄️ Cool Vibrant',
        colors: {
            '--background': '220 30% 4%',
            '--foreground': '220 30% 96%',
            '--card': '220 30% 10%',
            '--card-foreground': '220 30% 96%',
            '--popover': '220 30% 10%',
            '--popover-foreground': '220 30% 96%',
            '--primary': '200 100% 70%',
            '--primary-foreground': '220 30% 96%',
            '--secondary': '220 30% 16%',
            '--secondary-foreground': '220 30% 96%',
            '--muted': '220 30% 16%',
            '--muted-foreground': '220 20% 75%',
            '--accent': '270 100% 75%',
            '--accent-foreground': '220 30% 96%',
            '--destructive': '0 84% 60%',
            '--destructive-foreground': '220 30% 96%',
            '--border': '220 30% 28%',
            '--input': '220 30% 16%',
            '--ring': '200 100% 70%',
            '--success': '160 100% 60%',
            '--success-foreground': '220 30% 96%',
            '--warning': '50 100% 70%',
            '--warning-foreground': '220 30% 4%',
            '--error': '320 90% 65%',
            '--error-foreground': '220 30% 96%'
        }
    },
    'high-contrast': {
        name: '🎯 High Contrast',
        colors: {
            '--background': '0 0% 0%',
            '--foreground': '0 0% 100%',
            '--card': '0 0% 10%',
            '--card-foreground': '0 0% 100%',
            '--popover': '0 0% 10%',
            '--popover-foreground': '0 0% 100%',
            '--primary': '200 100% 70%',
            '--primary-foreground': '0 0% 100%',
            '--secondary': '0 0% 20%',
            '--secondary-foreground': '0 0% 100%',
            '--muted': '0 0% 20%',
            '--muted-foreground': '0 0% 80%',
            '--accent': '0 0% 20%',
            '--accent-foreground': '0 0% 100%',
            '--destructive': '0 100% 60%',
            '--destructive-foreground': '0 0% 100%',
            '--border': '0 0% 40%',
            '--input': '0 0% 20%',
            '--ring': '200 100% 70%',
            '--success': '120 100% 60%',
            '--success-foreground': '0 0% 100%',
            '--warning': '45 100% 65%',
            '--warning-foreground': '0 0% 0%',
            '--error': '0 100% 60%',
            '--error-foreground': '0 0% 100%'
        }
    },
    'pastel-dark': {
        name: '🖍️ Pastel Dark',
        colors: {
            '--background': '220 20% 8%',
            '--foreground': '220 20% 95%',
            '--card': '220 20% 15%',
            '--card-foreground': '220 20% 95%',
            '--popover': '220 20% 15%',
            '--popover-foreground': '220 20% 95%',
            '--primary': '200 70% 75%',
            '--primary-foreground': '220 20% 95%',
            '--secondary': '220 20% 22%',
            '--secondary-foreground': '220 20% 95%',
            '--muted': '220 20% 22%',
            '--muted-foreground': '220 15% 75%',
            '--accent': '280 60% 80%',
            '--accent-foreground': '220 20% 95%',
            '--destructive': '0 70% 65%',
            '--destructive-foreground': '220 20% 95%',
            '--border': '220 20% 30%',
            '--input': '220 20% 22%',
            '--ring': '200 70% 75%',
            '--success': '150 60% 70%',
            '--success-foreground': '220 20% 95%',
            '--warning': '40 70% 75%',
            '--warning-foreground': '220 20% 8%',
            '--error': '340 60% 75%',
            '--error-foreground': '220 20% 95%'
        }
    }
};

function createColorSwitcher() {
    // Create the switcher UI
    const switcherHTML = `
        <div id="color-switcher" style="position: fixed; top: 10px; left: 10px; z-index: 10000; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-family: system-ui, -apple-system, sans-serif;">
            <div style="color: hsl(var(--foreground)); font-size: 12px; font-weight: 600; margin-bottom: 8px;">🎨 Color Scheme:</div>
            <select id="color-scheme-select" style="background: hsl(var(--input)); color: hsl(var(--foreground)); border: 1px solid hsl(var(--border)); border-radius: 4px; padding: 6px 8px; font-size: 12px; width: 180px;">
                ${Object.entries(colorSchemes).map(([key, scheme]) => 
                    `<option value="${key}" ${key === 'cool-gray' ? 'selected' : ''}>${scheme.name}</option>`
                ).join('')}
            </select>
            <div style="color: hsl(var(--muted-foreground)); font-size: 10px; margin-top: 6px;">Same layout, different colors</div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', switcherHTML);
    
    // Add event listener
    document.getElementById('color-scheme-select').addEventListener('change', function(e) {
        applyColorScheme(e.target.value);
    });
    
    // Add keyboard shortcut
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            const select = document.getElementById('color-scheme-select');
            const options = Object.keys(colorSchemes);
            const currentIndex = options.indexOf(select.value);
            const nextIndex = (currentIndex + 1) % options.length;
            select.value = options[nextIndex];
            applyColorScheme(options[nextIndex]);
        }
    });
}

function applyColorScheme(schemeKey) {
    const scheme = colorSchemes[schemeKey];
    if (!scheme) return;
    
    const root = document.documentElement;
    
    // Apply all color variables
    Object.entries(scheme.colors).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });
    
    // Save preference
    localStorage.setItem('pro-upscaler-color-scheme', schemeKey);
    
    console.log(`🎨 Applied color scheme: ${scheme.name}`);
}

function loadSavedScheme() {
    const saved = localStorage.getItem('pro-upscaler-color-scheme');
    if (saved && colorSchemes[saved]) {
        applyColorScheme(saved);
        const select = document.getElementById('color-scheme-select');
        if (select) select.value = saved;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        createColorSwitcher();
        loadSavedScheme();
    });
} else {
    createColorSwitcher();
    loadSavedScheme();
}

console.log('🎨 Color Switcher loaded! Press Ctrl+K to cycle through schemes');
