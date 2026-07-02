'use client';

import React from 'react';
import { useDevStackLabels } from '@/components/dev/DevStackLabelsProvider';

interface SettingsPageProps {
  connected: boolean;
}

export default function SettingsPage({ connected }: SettingsPageProps) {
  const { enabled: devStackLabels, setEnabled: setDevStackLabels } = useDevStackLabels();
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Settings</h1>
        <p className="text-sm text-gray-500 mb-8">Platform configuration and preferences.</p>

        {/* Connection status */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Connection Status</h2>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              connected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-amber-500'}`} />
              {connected ? 'Luzmo logistics analytics connected' : 'Not connected'}
            </span>
          </div>
        </section>

        {/* Organization */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Organization</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
              <input type="text" defaultValue="Northbound Logistics" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Industry</label>
              <input type="text" defaultValue="Logistics & Supply Chain" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Operational Framework</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400">
                <option>Delivery SLA Framework</option>
                <option>Carrier Scorecard Model</option>
                <option>Warehouse Operations KPI Set</option>
                <option>Regional Logistics Performance</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Planning Horizon</label>
              <input type="text" defaultValue="FY2026" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400" />
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={devStackLabels}
                onChange={(e) => setDevStackLabels(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500/20"
              />
              <div>
                <p className="text-sm font-medium text-gray-700">Luzmo Component Annotation</p>
                <p className="text-xs text-gray-400">
                  Mirrors the floating toggle in the bottom-right corner: corner tags for ACK web components, Flex (
                  <code className="text-[10px]">@luzmo/react-embed</code>), the Data API chart path (POST{' '}
                  <code className="text-[10px]">/0.1.0/data</code>), and ACK REST helpers. Saved in this browser only.
                </p>
              </div>
            </label>
            {[
              { label: 'Auto-save workbooks', desc: 'Automatically save workbook changes every 30 seconds', checked: true },
              { label: 'AI suggestions', desc: 'Show chart recommendations for logistics operations', checked: true },
              { label: 'Email notifications', desc: 'Receive alerts when SLA targets are missed or data sources disconnect', checked: false },
            ].map((pref) => (
              <label key={pref.label} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={pref.checked}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500/20"
                />
                <div>
                  <p className="text-sm font-medium text-gray-700">{pref.label}</p>
                  <p className="text-xs text-gray-400">{pref.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <button className="px-5 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 shadow-sm transition-all">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
