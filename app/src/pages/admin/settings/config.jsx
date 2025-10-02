import { useState, useEffect } from "react";
import SettingsLayout from "../../../components/settingslayout";

export default function AdminConfig() {
  const [panelName, setPanelName] = useState("");
  const [footerText, setFooterText] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const defaultPanelName = "Osmium";
  const defaultFooterText = "© 2025 Carbon Labs. All rights reserved.";
  const defaultLogoUrl = "";

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((settings) => {
        setPanelName(settings.panel_name || defaultPanelName);
        setFooterText(settings.footer_text || defaultFooterText);
        setLogoUrl(settings.logo_url || defaultLogoUrl);
      });
  }, []);

  const handleReset = () => {
    setResetting(true);
    setPanelName(defaultPanelName);
    setFooterText(defaultFooterText);
    setLogoUrl(defaultLogoUrl);
    setTimeout(() => setResetting(false), 500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem("jwt");

    // Save settings
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        panel_name: panelName,
        footer_text: footerText,
        logo_url: logoUrl,
      }),
    });
    setSaving(false);
    if (res.ok) {
      alert("Settings saved successfully!");
    } else {
      alert("Failed to save settings");
    }
  };

  return (
    <SettingsLayout>
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
        <h2 className="text-xl font-medium text-white mb-4">
          Panel Configuration
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Panel Name Section */}
            <div>
              <label
                htmlFor="panel-name"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Panel Name
              </label>
              <input
                type="text"
                id="panel-name"
                value={panelName}
                onChange={(e) => setPanelName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                placeholder="Enter panel name"
              />
              <p className="mt-1 text-sm text-gray-400">
                This name will appear in the browser title and header and other
                ui elements.
              </p>
            </div>
            {/* Logo URL Input Section */}
            <div>
              <label
                htmlFor="logo-url"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Panel Logo URL
              </label>
              <input
                type="text"
                id="logo-url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                placeholder="Enter logo URL (https://...)"
              />
              {logoUrl && (
                <div className="mt-3 flex justify-center">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-w-full max-h-24 object-contain"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                </div>
              )}
              <p className="mt-1 text-sm text-gray-400">
                Enter a direct URL to an image file (PNG, JPG, GIF).
              </p>
            </div>
            {/* Footer Text Section */}
            <div>
              <label
                htmlFor="footer-text"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Footer Text
              </label>
              <textarea
                id="footer-text"
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
                placeholder="Enter footer text"
              />
              <p className="mt-1 text-sm text-gray-400">
                This text will appear in the footer of all pages.
              </p>
            </div>
            {/* Buttons Section */}
            <div className="pt-4 flex justify-between items-center">
              <button
                type="button"
                onClick={handleReset}
                className="bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                disabled={resetting}
              >
                {resetting ? "Resetting..." : "Reset to Default"}
              </button>
              <button
                type="submit"
                className="bg-white hover:bg-gray-100 text-gray-800 font-medium py-2 px-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}
