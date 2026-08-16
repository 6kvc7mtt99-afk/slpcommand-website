export function ExamDisclaimerGate({
  skill,
  onAccept,
  onCancel,
}: {
  skill: string;
  onAccept: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="skill-primary">
      <p className="home-kicker">Before you start</p>
      <h2>Educational simulation only</h2>
      <p>
        This {skill} exam is an educational simulation. It is not an official STANAG 6001 / SLP qualification
        and is not affiliated with NATO or any examining authority.
      </p>
      <p className="muted">
        Completing it does not confer, guarantee, or replace an official result. Only authorised examining
        bodies can award an official qualification.
      </p>
      <div className="cta-row">
        <button className="btn btn-primary" type="button" onClick={onAccept}>
          I understand — start exam
        </button>
        <button className="btn btn-outline" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </article>
  );
}
