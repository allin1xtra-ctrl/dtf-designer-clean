"use client";
import React, { useState } from "react";

/**
 * AdvancedAdminSettings
 * Provides advanced admin controls for the Shopify app, including:
 * - Feature toggles
 * - API key management
 * - Webhook management
 * - Data export/import
 * - Danger zone (delete/reset)
 */
const AdvancedAdminSettings = () => {
  const [featureFlags, setFeatureFlags] = useState({
    enableBeta: false,
    enableLogging: false,
  });
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dangerLoading, setDangerLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [prompt, setPrompt] = useState("");

  // Send a custom prompt to the backend OpenAI API
  const handleSendPrompt = async () => {
    if (!prompt) {
      setAiResult("Please enter a prompt.");
      return;
    }
    setAiResult("Loading...");
    try {
      const res = await fetch("/api/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      const data = await res.json();
      setAiResult(data.result || data.error || "No response");
    } catch (err) {
      setAiResult("Error: " + err.message);
    }
  };

  // Toggle feature flags
  const handleToggle = (flag) => {
    setFeatureFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  // Simulate API key save
  const handleSaveApiKey = () => {
    alert("API Key saved: " + apiKey);
  };

  // Simulate webhook save
  const handleSaveWebhook = () => {
    alert("Webhook URL saved: " + webhookUrl);
  };

  // Simulate data export
  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      alert("Data exported!");
    }, 1200);
  };

  // Simulate data import
  const handleImport = () => {
    setImporting(true);
    setTimeout(() => {
      setImporting(false);
      alert("Data imported!");
    }, 1200);
  };

  // Simulate danger zone action
  const handleDanger = () => {
    if (!window.confirm("Are you sure? This cannot be undone!")) return;
    setDangerLoading(true);
    setTimeout(() => {
      setDangerLoading(false);
      alert("All data deleted. App reset.");
    }, 2000);
  };

  return (
    <div className="p-6 bg-white rounded shadow max-w-xl">
      <h2 className="text-xl font-bold mb-4">Advanced Admin Settings</h2>

      {/* Feature Flags */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Feature Toggles</h3>
        <label className="flex items-center mb-1">
          <input
            type="checkbox"
            checked={featureFlags.enableBeta}
            onChange={() => handleToggle("enableBeta")}
            className="mr-2"
          />
          Enable Beta Features
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={featureFlags.enableLogging}
            onChange={() => handleToggle("enableLogging")}
            className="mr-2"
          />
          Enable Logging
        </label>
      </div>

      {/* API Key Management */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">API Key Management</h3>
        <input
          id="api-key"
          name="apiKey"
          className="border p-2 w-full mb-2"
          placeholder="API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleSaveApiKey}
        >
          Save API Key
        </button>
      </div>

      {/* Webhook Management */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Webhook Management</h3>
        <input
          id="webhook-url"
          name="webhookUrl"
          className="border p-2 w-full mb-2"
          placeholder="Webhook URL"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleSaveWebhook}
        >
          Save Webhook
        </button>
      </div>

      {/* Data Export/Import */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2">Data Export / Import</h3>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded mr-2"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? "Exporting..." : "Export Data"}
        </button>
        <button
          className="bg-yellow-600 text-white px-4 py-2 rounded"
          onClick={handleImport}
          disabled={importing}
        >
          {importing ? "Importing..." : "Import Data"}
        </button>
      </div>

      {/* Danger Zone */}
      <div className="mb-2 border-t pt-4">
        <h3 className="font-semibold mb-2 text-red-700">Danger Zone</h3>
        <button
          className="bg-red-700 text-white px-4 py-2 rounded"
          onClick={handleDanger}
          disabled={dangerLoading}
        >
          {dangerLoading ? "Deleting..." : "Delete All Data & Reset App"}
        </button>
      </div>

      {/* AI-Powered Features */}
      <div className="mb-4 mt-6">
        <h3 className="font-semibold mb-2">AI-Powered Features</h3>
        <div className="mb-2">
          <label htmlFor="ai-prompt" className="block mb-1 font-medium">Prompt to OpenAI</label>
          <input
            id="ai-prompt"
            name="aiPrompt"
            className="border p-2 w-full mb-2 text-black"
            placeholder="Type your prompt here..."
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          <button
            className="bg-purple-700 text-white px-4 py-2 rounded mb-2"
            onClick={handleSendPrompt}
          >
            Send Prompt to OpenAI
          </button>
        </div>
        {prompt && (
          <div className="mb-2 text-sm text-gray-700 bg-gray-100 rounded p-2">
            <strong>Prompt:</strong> {prompt}
          </div>
        )}
        {aiResult && (
          <div className="mt-2 p-2 bg-gray-100 text-gray-900 rounded">
            <strong>AI Response:</strong> {aiResult}
          </div>
        )}
        <div className="mt-4">
          <h4 className="font-semibold mb-1">Coming Soon: More AI Features</h4>
          <ul className="list-disc ml-6 text-gray-700">
            <li>Background remover for images</li>
            <li>Automatic image upscaling to 300 DPI</li>
            <li>Design cleanup and enhancement</li>
            <li>Product description generator</li>
            <li>And more AI-powered tools for your DTF workflow!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAdminSettings;