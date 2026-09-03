import Link from "next/link";
import { FOOTER_GROUPS, PRIMARY_CTA } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="sf">
      <div className="sf-inner">
        <div>
          <div className="sf-brand">
            <span className="sh-mark" aria-hidden="true">
              SLP
            </span>
            <span>SLP Command</span>
          </div>
          <p className="sf-line">
            Independent training platform for STANAG 6001 / SLP Levels 2 and 3. Reading, Listening,
            Writing and Speaking, measured against the criteria the exam rates.
          </p>
          <p className="sf-disclaimer">
            Not NATO. Not a Ministry of Defence. Not an official examining body. AI feedback is
            indicative guidance, not an official assessment.
          </p>
          <div className="sf-cta">
            <Link className="s-btn" href={PRIMARY_CTA.href}>
              Start training free
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="sf-columns">
          {FOOTER_GROUPS.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="sf-heading">{group.heading}</p>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="sf-legal">
        <p>© 2026 SLP Command. Not affiliated with NATO or any official body.</p>
        <p>slpcommand.com · English · Español</p>
      </div>
    </footer>
  );
}
