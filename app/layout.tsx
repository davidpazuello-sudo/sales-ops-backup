// @ts-nocheck
import { IBM_Plex_Sans, Manrope, Montserrat, Nunito_Sans, Source_Sans_3, Work_Sans } from "next/font/google";
import "./globals.css";

const themeBootstrapScript = `
(() => {
  const STORAGE_KEY = "sales-ops-backup-personalization";
  const defaults = {
    theme: "Claro ativo",
    font: "Manrope",
    fontSize: "Media",
    density: "Confortavel",
    highContrast: false,
    animations: true,
    reinforcedCards: false,
    showShortcuts: true,
    instantPreview: true,
  };

  const fontMap = {
    manrope: "manrope",
    "ibm plex sans": "ibm-plex-sans",
    "source sans 3": "source-sans-3",
    montserrat: "montserrat",
    "nunito sans": "nunito-sans",
    "work sans": "work-sans",
  };

  const fontVariableMap = {
    manrope: "var(--font-manrope)",
    "ibm plex sans": "var(--font-ibm-plex-sans)",
    "source sans 3": "var(--font-source-sans)",
    montserrat: "var(--font-montserrat)",
    "nunito sans": "var(--font-nunito-sans)",
    "work sans": "var(--font-work-sans)",
  };

  const fontSizeMap = {
    pequena: "small",
    media: "medium",
    grande: "large",
    small: "small",
    medium: "medium",
    large: "large",
  };

  const densityMap = {
    compacta: "compact",
    confortavel: "comfortable",
    expandida: "expanded",
    compact: "compact",
    comfortable: "comfortable",
    expanded: "expanded",
  };

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase()
      .trim();

  const applyTheme = (personalization) => {
    const root = document.documentElement;
    const systemDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const normalizedTheme = normalize(personalization.theme);
    const normalizedFont = normalize(personalization.font);
    const normalizedFontSize = normalize(personalization.fontSize);
    const normalizedDensity = normalize(personalization.density);

    const theme = normalizedTheme.includes("escuro")
      ? "dark"
      : (normalizedTheme.includes("automatic")
        ? (systemDark ? "dark" : "light")
        : "light");

    root.dataset.theme = theme;
    root.dataset.font = fontMap[normalizedFont] || "manrope";
    root.dataset.fontSize = fontSizeMap[normalizedFontSize] || "medium";
    root.dataset.density = densityMap[normalizedDensity] || "comfortable";
    root.dataset.contrast = personalization.highContrast ? "high" : "normal";
    root.dataset.cards = personalization.reinforcedCards ? "reinforced" : "standard";
    root.dataset.animations = personalization.animations === false ? "off" : "on";
    root.dataset.shortcuts = personalization.showShortcuts === false ? "off" : "on";
    root.dataset.preview = personalization.instantPreview === false ? "manual" : "instant";
    root.style.setProperty("--app-font", fontVariableMap[normalizedFont] || "var(--font-manrope)");
    root.style.colorScheme = theme;
    root.style.backgroundColor = theme === "dark" ? "#0f1726" : "#f6f7fa";
  };

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const personalization = stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
    applyTheme(personalization);
  } catch {
    applyTheme(defaults);
  }
})();
`;

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito-sans",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-work-sans",
});

export const metadata = {
  title: "sales-ops-backup",
  description: "Painel comercial sales-ops-backup",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${manrope.variable} ${ibmPlexSans.variable} ${sourceSans.variable} ${montserrat.variable} ${nunitoSans.variable} ${workSans.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
