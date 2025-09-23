// Pro Upscaler Theme Switching System
// Allows easy testing of different color palettes

class ThemeSwitcher {
    constructor() {
        this.themes = {
            'dark-blue': {
                name: 'Dark Blue',
                colors: {
                    '--background': '210 40% 3%',
                    '--foreground': '210 40% 98%',
                    '--card': '210 40% 8%',
                    '--card-foreground': '210 40% 98%',
                    '--primary': '217 91% 60%',
                    '--primary-foreground': '210 40% 98%',
                    '--secondary': '210 40% 15%',
                    '--secondary-foreground': '210 40% 98%',
                    '--muted': '210 40% 15%',
                    '--muted-foreground': '210 20% 65%',
                    '--accent': '210 40% 15%',
                    '--accent-foreground': '210 40% 98%',
                    '--border': '210 40% 20%',
                    '--input': '210 40% 15%',
                    '--ring': '217 91% 60%',
                    '--success': '142 76% 36%',
                    '--success-foreground': '210 40% 98%',
                    '--warning': '48 96% 53%',
                    '--warning-foreground': '210 40% 3%',
                    '--error': '0 84% 60%',
                    '--error-foreground': '210 40% 98%'
                }
            },
            'dark-green': {
                name: 'Dark Green',
                colors: {
                    '--background': '210 40% 3%',
                    '--foreground': '210 40% 98%',
                    '--card': '210 40% 8%',
                    '--card-foreground': '210 40% 98%',
                    '--primary': '142 76% 36%',
                    '--primary-foreground': '210 40% 98%',
                    '--secondary': '210 40% 15%',
                    '--secondary-foreground': '210 40% 98%',
                    '--muted': '210 40% 15%',
                    '--muted-foreground': '210 20% 65%',
                    '--accent': '210 40% 15%',
                    '--accent-foreground': '210 40% 98%',
                    '--border': '210 40% 20%',
                    '--input': '210 40% 15%',
                    '--ring': '142 76% 36%',
                    '--success': '142 76% 36%',
                    '--success-foreground': '210 40% 98%',
                    '--warning': '48 96% 53%',
                    '--warning-foreground': '210 40% 3%',
                    '--error': '0 84% 60%',
                    '--error-foreground': '210 40% 98%'
                }
            },
            'dark-purple': {
                name: 'Dark Purple',
                colors: {
                    '--background': '210 40% 3%',
                    '--foreground': '210 40% 98%',
                    '--card': '210 40% 8%',
                    '--card-foreground': '210 40% 98%',
                    '--primary': '263 70% 50%',
                    '--primary-foreground': '210 40% 98%',
                    '--secondary': '210 40% 15%',
                    '--secondary-foreground': '210 40% 98%',
                    '--muted': '210 40% 15%',
                    '--muted-foreground': '210 20% 65%',
                    '--accent': '210 40% 15%',
                    '--accent-foreground': '210 40% 98%',
                    '--border': '210 40% 20%',
                    '--input': '210 40% 15%',
                    '--ring': '263 70% 50%',
                    '--success': '142 76% 36%',
                    '--success-foreground': '210 40% 98%',
                    '--warning': '48 96% 53%',
                    '--warning-foreground': '210 40% 3%',
                    '--error': '0 84% 60%',
                    '--error-foreground': '210 40% 98%'
                }
            },
            'dark-orange': {
                name: 'Dark Orange',
                colors: {
                    '--background': '210 40% 3%',
                    '--foreground': '210 40% 98%',
                    '--card': '210 40% 8%',
                    '--card-foreground': '210 40% 98%',
                    '--primary': '25 95% 53%',
                    '--primary-foreground': '210 40% 98%',
                    '--secondary': '210 40% 15%',
                    '--secondary-foreground': '210 40% 98%',
                    '--muted': '210 40% 15%',
                    '--muted-foreground': '210 20% 65%',
                    '--accent': '210 40% 15%',
                    '--accent-foreground': '210 40% 98%',
                    '--border': '210 40% 20%',
                    '--input': '210 40% 15%',
                    '--ring': '25 95% 53%',
                    '--success': '142 76% 36%',
                    '--success-foreground': '210 40% 98%',
                    '--warning': '48 96% 53%',
                    '--warning-foreground': '210 40% 3%',
                    '--error': '0 84% 60%',
                    '--error-foreground': '210 40% 98%'
                }
            },
            'dark-cyan': {
                name: 'Dark Cyan',
                colors: {
                    '--background': '210 40% 3%',
                    '--foreground': '210 40% 98%',
                    '--card': '210 40% 8%',
                    '--card-foreground': '210 40% 98%',
                    '--primary': '188 94% 43%',
                    '--primary-foreground': '210 40% 98%',
                    '--secondary': '210 40% 15%',
                    '--secondary-foreground': '210 40% 98%',
                    '--muted': '210 40% 15%',
                    '--muted-foreground': '210 20% 65%',
                    '--accent': '210 40% 15%',
                    '--accent-foreground': '210 40% 98%',
                    '--border': '210 40% 20%',
                    '--input': '210 40% 15%',
                    '--ring': '188 94% 43%',
                    '--success': '142 76% 36%',
                    '--success-foreground': '210 40% 98%',
                    '--warning': '48 96% 53%',
                    '--warning-foreground': '210 40% 3%',
                    '--error': '0 84% 60%',
                    '--error-foreground': '210 40% 98%'
                }
            }
        };
        
        this.currentTheme = 'dark-blue';
        this.init();
    }
    
    init() {
        this.createThemeSelector();
        this.loadSavedTheme();
        this.applyTheme(this.currentTheme);
    }
    
    createThemeSelector() {
        // Create theme selector UI
        const themeSelector = document.createElement('div');
        themeSelector.id = 'theme-selector';
        themeSelector.innerHTML = `
            <div style="position: fixed; top: 10px; right: 10px; z-index: 1000; background: hsl(var(--card)); border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <label style="color: hsl(var(--foreground)); font-size: 12px; font-weight: 500; margin-right: 8px;">Theme:</label>
                <select id="theme-select" style="background: hsl(var(--input)); color: hsl(var(--foreground)); border: 1px solid hsl(var(--border)); border-radius: 4px; padding: 4px 8px; font-size: 12px;">
                    ${Object.entries(this.themes).map(([key, theme]) => 
                        `<option value="${key}">${theme.name}</option>`
                    ).join('')}
                </select>
            </div>
        `;
        
        document.body.appendChild(themeSelector);
        
        // Add event listener
        document.getElementById('theme-select').addEventListener('change', (e) => {
            this.switchTheme(e.target.value);
        });
    }
    
    switchTheme(themeName) {
        if (!this.themes[themeName]) {
            console.error(`Theme "${themeName}" not found`);
            return;
        }
        
        this.currentTheme = themeName;
        this.applyTheme(themeName);
        this.saveTheme(themeName);
        
        console.log(`🎨 Switched to theme: ${this.themes[themeName].name}`);
    }
    
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        const root = document.documentElement;
        
        // Apply all color variables
        Object.entries(theme.colors).forEach(([property, value]) => {
            root.style.setProperty(property, value);
        });
        
        // Update theme selector if it exists
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = themeName;
        }
    }
    
    saveTheme(themeName) {
        localStorage.setItem('pro-upscaler-theme', themeName);
    }
    
    loadSavedTheme() {
        const saved = localStorage.getItem('pro-upscaler-theme');
        if (saved && this.themes[saved]) {
            this.currentTheme = saved;
        }
    }
    
    // Add a new theme dynamically
    addTheme(key, name, colors) {
        this.themes[key] = { name, colors };
        this.updateThemeSelector();
    }
    
    updateThemeSelector() {
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.innerHTML = Object.entries(this.themes).map(([key, theme]) => 
                `<option value="${key}" ${key === this.currentTheme ? 'selected' : ''}>${theme.name}</option>`
            ).join('');
        }
    }
    
    // Get current theme colors
    getCurrentColors() {
        return this.themes[this.currentTheme].colors;
    }
    
    // Export theme for sharing
    exportTheme(themeName = this.currentTheme) {
        return JSON.stringify({
            name: this.themes[themeName].name,
            colors: this.themes[themeName].colors
        }, null, 2);
    }
    
    // Import theme from JSON
    importTheme(themeData, key) {
        try {
            const parsed = typeof themeData === 'string' ? JSON.parse(themeData) : themeData;
            this.addTheme(key, parsed.name, parsed.colors);
            console.log(`✅ Imported theme: ${parsed.name}`);
        } catch (error) {
            console.error('Failed to import theme:', error);
        }
    }
}

// Initialize theme switcher when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeSwitcher = new ThemeSwitcher();
    
    // Add keyboard shortcut for quick theme switching
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            const themes = Object.keys(window.themeSwitcher.themes);
            const currentIndex = themes.indexOf(window.themeSwitcher.currentTheme);
            const nextIndex = (currentIndex + 1) % themes.length;
            window.themeSwitcher.switchTheme(themes[nextIndex]);
        }
    });
    
    console.log('🎨 Theme Switcher initialized');
    console.log('💡 Use Ctrl+Shift+T to cycle through themes');
    console.log('💡 Use the dropdown in the top-right corner to select themes');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeSwitcher;
} 