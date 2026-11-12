export const themeStorageKey='devmasters_theme';

// Apply the saved theme before the page paints, including on a direct page load.
export const themeInitScript=`(()=>{let theme;try{theme=localStorage.getItem('${themeStorageKey}')}catch{}if(theme!=='dark'&&theme!=='light')theme=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme})()`;
