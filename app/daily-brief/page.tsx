"use client";

// Placeholder Daily Brief page. Owner: Person 4 — wires this up to real
// /api/process-inbox response data (threads/timeline/mode) and builds
// out the three-column layout.

export default function DailyBriefPage() {
  return (
    <div>
      <h1>Daily Brief</h1>
      <div>
        <section>
          <h2>Urgent</h2>
          {/* TODO(Person 4): render urgent threads */}
        </section>
        <section>
          <h2>This Week</h2>
          {/* TODO(Person 4): render this_week threads */}
        </section>
        <section>
          <h2>FYI</h2>
          {/* TODO(Person 4): render fyi threads */}
        </section>
      </div>
    </div>
  );
}
