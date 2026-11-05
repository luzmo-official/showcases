"use client";

import { useState } from "react";
import { LuzmoVizItemComponent } from "@luzmo/react-embed";
import type { EmbedCredentials, VisualizationItem } from "@/lib/types";

export function LuzmoChart({
  item,
  embed,
}: {
  item: VisualizationItem;
  embed: EmbedCredentials;
}) {
  const [failed, setFailed] = useState(false);
  const apiHost =
    embed.apiHost === "/" && typeof window !== "undefined"
      ? window.location.origin
      : embed.apiHost;

  if (failed) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
        The flex chart ({item.type}) could not be rendered.
      </p>
    );
  }

  return (
    <div className="h-[280px] overflow-auto rounded-xl border border-slate-200 bg-white">
      <LuzmoVizItemComponent
        className="block h-full min-h-[260px] w-full"
        authKey={embed.authKey}
        authToken={embed.authToken}
        apiHost={apiHost}
        appServer={embed.appServer}
        type={item.type}
        slots={item.slots as never}
        options={item.options as never}
        filters={item.filters as never}
        error={() => setFailed(true)}
      />
    </div>
  );
}
