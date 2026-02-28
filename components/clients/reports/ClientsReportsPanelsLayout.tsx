"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  CLIENTS_REPORT_PANEL_OPTIONS,
  type ClientsReportPanelKey
} from "@/lib/clients/reports/panels";
import {
  CLIENTS_REPORTS_PANELS_STORAGE_KEY,
  countActiveClientsReportsPanels,
  getAllVisibleClientsReportsPanels,
  getDefaultClientsReportsPanelsVisibility,
  parseClientsReportsPanelsVisibility,
  serializeClientsReportsPanelsVisibility,
  type ClientsReportsPanelsVisibility
} from "@/lib/clients/reports/panelsPreferences";

export default function ClientsReportsPanelsLayout({
  byTypePanel,
  topChannelsPanel,
  insurersByLinePanel,
  geoPanel,
  topReferrersPanel,
  birthdaysPanel,
  clientsListPanel
}: {
  byTypePanel: ReactNode;
  topChannelsPanel: ReactNode;
  insurersByLinePanel: ReactNode;
  geoPanel: ReactNode;
  topReferrersPanel: ReactNode;
  birthdaysPanel: ReactNode;
  clientsListPanel: ReactNode;
}) {
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [visibility, setVisibility] = useState<ClientsReportsPanelsVisibility>(
    getDefaultClientsReportsPanelsVisibility()
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = parseClientsReportsPanelsVisibility(
      window.localStorage.getItem(CLIENTS_REPORTS_PANELS_STORAGE_KEY)
    );
    if (stored) setVisibility(stored);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      CLIENTS_REPORTS_PANELS_STORAGE_KEY,
      serializeClientsReportsPanelsVisibility(visibility)
    );
  }, [visibility]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!popoverRef.current) return;
      if (event.target instanceof Node && !popoverRef.current.contains(event.target)) {
        setIsPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function togglePanel(key: ClientsReportPanelKey) {
    setVisibility((current) => ({ ...current, [key]: !current[key] }));
  }

  const topPanels = useMemo(
    () =>
      [
        { key: "by_type", visible: visibility.by_type, node: byTypePanel },
        { key: "top_channels", visible: visibility.top_channels, node: topChannelsPanel },
        { key: "insurers_by_line", visible: visibility.insurers_by_line, node: insurersByLinePanel }
      ] satisfies Array<{ key: ClientsReportPanelKey; visible: boolean; node: ReactNode }>,
    [
      byTypePanel,
      insurersByLinePanel,
      topChannelsPanel,
      visibility.by_type,
      visibility.insurers_by_line,
      visibility.top_channels
    ]
  );
  const secondaryPanels = useMemo(
    () =>
      [
        { key: "geo", visible: visibility.geo, node: geoPanel },
        { key: "top_referrers", visible: visibility.top_referrers, node: topReferrersPanel },
        { key: "birthdays", visible: visibility.birthdays, node: birthdaysPanel },
        { key: "clients_list", visible: visibility.clients_list, node: clientsListPanel }
      ] satisfies Array<{ key: ClientsReportPanelKey; visible: boolean; node: ReactNode }>,
    [
      birthdaysPanel,
      clientsListPanel,
      geoPanel,
      topReferrersPanel,
      visibility.birthdays,
      visibility.clients_list,
      visibility.geo,
      visibility.top_referrers
    ]
  );
  const activePanels = countActiveClientsReportsPanels(visibility);
  const anyTopCardsVisible = useMemo(() => topPanels.some((panel) => panel.visible), [topPanels]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dce7f5] bg-white p-2 shadow-sm">
        <div className="relative inline-flex" ref={popoverRef}>
          <button
            type="button"
            aria-expanded={isPopoverOpen}
            onClick={() => setIsPopoverOpen((current) => !current)}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
          >
            Paneles ({activePanels} activos)
            <ChevronDown size={14} className={isPopoverOpen ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>

          {isPopoverOpen && (
            <div className="absolute left-0 top-full z-30 mt-1 w-[min(92vw,320px)] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#2e75ba]">Paneles visibles</p>
                <p className="text-xs text-slate-500">{activePanels}/{CLIENTS_REPORT_PANEL_OPTIONS.length}</p>
              </div>

              <div className="space-y-1.5">
                {CLIENTS_REPORT_PANEL_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={visibility[option.key]}
                      onChange={() => togglePanel(option.key)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#4aa59c]"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setVisibility(getAllVisibleClientsReportsPanels(true))}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  Mostrar todo
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility(getAllVisibleClientsReportsPanels(false))}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  Ocultar todo
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility(getDefaultClientsReportsPanelsVisibility())}
                  className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-[#4aadf5] hover:text-[#2e75ba]"
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {anyTopCardsVisible && (
        <section className="grid gap-3 lg:grid-cols-3">
          {topPanels.map((panel) =>
            panel.visible ? <Fragment key={panel.key}>{panel.node}</Fragment> : null
          )}
        </section>
      )}

      {secondaryPanels.map((panel) =>
        panel.visible ? <Fragment key={panel.key}>{panel.node}</Fragment> : null
      )}
    </div>
  );
}
