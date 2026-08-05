"use client";

// Placeholder landing page. Owner: Person 4 — builds this out (styling,
// real email list rendering, navigation to /daily-brief, etc.)

import mockInbox from "@/data/mock-inbox.json";

export default function Home() {
  const handleProcessInbox = () => {
    // TODO(Person 4): call /app/api/process-inbox and route to /daily-brief
    console.log("Process My Inbox clicked");
  };

  return (
    <div>
      <h1>Daily Brief</h1>
      <ul>
        {mockInbox.map((email) => (
          <li key={email.id}>
            {email.from} — {email.subject}
          </li>
        ))}
      </ul>
      <button onClick={handleProcessInbox}>Process My Inbox</button>
    </div>
  );
}
