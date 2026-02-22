'use client';

import ConversationList from "./ConversationList";
import ChatThread from "./ChatThread";
import ContactContextPanel from "./ContactContextPanel";

export default function WhatsAppShell() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[360px_1.3fr_420px]">
        <ConversationList />
        <ChatThread />
        <ContactContextPanel />
      </div>
    </div>
  );
}
