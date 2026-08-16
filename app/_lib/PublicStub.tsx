export function PublicStub({ title }: { title: string }) {
  return (
    <main style={{ padding: "48px 24px", maxWidth: 720, margin: "0 auto" }}>
      <p style={{ color: "var(--muted)", fontSize: 13 }}>PR-00 route probe</p>
      <h1>{title}</h1>
      <p>Full copy lands in PR-02. This route exists so the adapter can serve all 15 public URLs.</p>
    </main>
  );
}
