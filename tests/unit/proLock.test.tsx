/** @vitest-environment happy-dom */
//
// FASE MONETIZATION-BOUNDARY-001 (mitad cliente) — la oferta que sustituye a un
// campo retenido.
//
// ── QUÉ SE ROMPIÓ, Y POR QUÉ NO SE VEÍA ────────────────────────────────────
//
// El backend lleva desde `aece55b` en producción devolviendo `proLock` a las
// cuentas Free, verificado en vivo, y aun así no aparecía nada. Dos causas
// independientes, no una:
//
//   1. `decodeSessionToday` — el único punto por el que pasa la respuesta,
//      tanto en servidor como en cliente — no copiaba `proLock` al objeto que
//      construye. El campo se perdía entre la API y la UI, en una línea que
//      nadie había escrito.
//   2. La oferta se había escrito en `TodaySessionCard`, un componente que
//      NADIE MONTABA desde que 8e076a0 reconstruyó la home «as stages, not
//      cards». Ya está borrado; la home real es `HomeDashboard`.
//
// Además el decodificador convertía `null` en `{}` para `coachLine`, `roi` y
// `coachSummary`. Era correcto cuando el único riesgo era un payload
// malformado; desde que el backend usa `null` para decir "retenido", coerción
// a `{}` producía un objeto de cadenas vacías indistinguible de un coach que no
// tenía nada que decir. Se perdía justo la distinción que el backend se había
// molestado en hacer.
//
// Estos tests fijan las dos mitades: que la oferta LLEGA, y que sólo llega a
// quien debe.

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { decodeSessionToday } from "../../lib/api/sessionToday";

afterEach(() => {
  cleanup();
});

/** Lo que el backend devuelve HOY a una cuenta Free. Copiado de producción. */
const FREE_PAYLOAD = {
  version: "session-today/1.0.0",
  mission: {
    headline: "Fill in the picture",
    reason: "Two skills have no recent evidence.",
    coachLine: null,
  },
  session: {
    blocks: [
      { skill: "listening", minutes: 10, posture: "recovering", why: "Yesterday slipped.", focus: "gist" },
      { skill: "reading", minutes: 10, posture: "steady", why: "Keep the streak.", focus: "inference" },
    ],
    estimatedMinutes: 20,
    requestedMinutes: 25,
  },
  roi: null,
  coachSummary: null,
  intelligenceSummary: { findings: [{ question: "Where am I weakest?", answer: "Listening." }], plannedMinutes: 20 },
  proLock: {
    feature: "adaptive_coach",
    title: "Know what to train first",
    body: "Pro ranks today's plan by what will move your score most.",
    cta: "See Pro",
  },
};

/** Lo mismo para una cuenta Pro: los campos llegan, y no hay oferta. */
const PRO_PAYLOAD = {
  ...FREE_PAYLOAD,
  mission: { ...FREE_PAYLOAD.mission, coachLine: { headline: "Short clips", why: "Accuracy first", focus: "gist" } },
  roi: { best: { skill: "listening", because: ["biggest gap"] } },
  coachSummary: { headline: "Today", body: "Two blocks, twenty minutes." },
  proLock: undefined,
};

describe("decodeSessionToday — the offer survives the decoder", () => {
  it("carries proLock through to the UI object", () => {
    const today = decodeSessionToday(FREE_PAYLOAD);
    expect(today?.proLock).toEqual({
      feature: "adaptive_coach",
      title: "Know what to train first",
      body: "Pro ranks today's plan by what will move your score most.",
      cta: "See Pro",
    });
  });

  it("leaves proLock undefined for a plan that had nothing withheld", () => {
    expect(decodeSessionToday(PRO_PAYLOAD)?.proLock).toBeUndefined();
  });

  it("drops an incomplete offer rather than rendering half a card", () => {
    // Un título sin CTA pintaría un botón sin texto. Mejor no pintar nada.
    for (const broken of [
      { ...FREE_PAYLOAD, proLock: { feature: "adaptive_coach", title: "T", body: "B" } },
      { ...FREE_PAYLOAD, proLock: { feature: "adaptive_coach", title: "", body: "B", cta: "C" } },
      { ...FREE_PAYLOAD, proLock: "not an object" },
    ]) {
      expect(decodeSessionToday(broken)?.proLock).toBeUndefined();
    }
  });

  it("keeps a withheld field as null instead of coercing it to empty strings", () => {
    const free = decodeSessionToday(FREE_PAYLOAD);
    expect(free?.mission.coachLine).toBeNull();
    expect(free?.roi).toBeNull();
    expect(free?.coachSummary).toBeNull();
  });

  it("still decodes those fields normally when the plan grants them", () => {
    const pro = decodeSessionToday(PRO_PAYLOAD);
    expect(pro?.mission.coachLine?.headline).toBe("Short clips");
    expect(pro?.roi?.best.skill).toBe("listening");
    expect(pro?.coachSummary?.headline).toBe("Today");
  });

  it("keeps the diagnosis a Free learner is entitled to", () => {
    // Lo que Pro vende es la prescripción, no el diagnóstico. Si esto se
    // rompiese, la frontera de monetización estaría cobrando de más.
    const free = decodeSessionToday(FREE_PAYLOAD);
    expect(free?.mission.headline).toBe("Fill in the picture");
    expect(free?.session.blocks).toHaveLength(2);
    expect(free?.intelligenceSummary.findings).toHaveLength(1);
  });
});

// ── LA RAZÓN POR LA QUE ESTE BLOQUE EXISTE ─────────────────────────────────
//
// Los tests del decodificador pasaban, la oferta llegaba, y la página
// desplegada seguía sin mostrarla: estaba escrita en un componente huérfano.
// Estos tests son sobre la ruta que un usuario recorre de verdad, y fallarían
// si alguien volviera a mover el render fuera de ella.

import { HomeDashboard } from "../../components/home/HomeDashboard";
import { vi } from "vitest";

vi.mock("../../lib/api/client", () => ({
  apiRequest: vi.fn(() => Promise.reject(new Error("isolated"))),
}));

function initialWith(payload: unknown) {
  return {
    flags: {
      reading_enabled: true, listening_enabled: true, writing_enabled: true,
      speaking_enabled: true, academy_enabled: true, home_v3_enabled: false,
      web_billing_enabled: true,
    },
    entitlements: { status: "noPlan" as const },
    progress: null,
    sessionToday: decodeSessionToday(payload),
    streak: null,
    achievements: null,
    recent: null,
    greetingName: "Rafa",
  };
}

describe("HomeDashboard — the offer on the page a learner actually loads", () => {
  it("renders the offer for a Free learner, as a link to /subscription", () => {
    render(<HomeDashboard initial={initialWith(FREE_PAYLOAD) as never} userId="u1" />);
    const link = screen.getByRole("link", { name: /Know what to train first/i });
    expect(link.getAttribute("href")).toBe("/subscription");
    expect(screen.getByText("See Pro")).toBeTruthy();
  });

  it("renders no offer when nothing was withheld", () => {
    render(<HomeDashboard initial={initialWith(PRO_PAYLOAD) as never} userId="u1" />);
    expect(screen.queryByText("Know what to train first")).toBeNull();
  });

  it("still shows the mission and blocks a Free learner is entitled to", () => {
    render(<HomeDashboard initial={initialWith(FREE_PAYLOAD) as never} userId="u1" />);
    expect(screen.getByText("Fill in the picture")).toBeTruthy();
    expect(screen.getAllByText(/listening|reading/i).length).toBeGreaterThan(0);
  });
});

// ── A002-01 · lo que Pro compra tiene que verse ────────────────────────────
//
// GLOBAL AUDIT 002 midió que `commercialPayload.js` retiene CINCO campos a un
// plan Free —`mission.coachLine`, `session.skillsSkipped`,
// `expectedOutcome.projections`, `roi` y `coachSummary`— y que sólo
// `projections` llegaba a pintarse. `skillsSkipped` y `roi` aparecían nada más
// que en la consola de admin interna; `coachLine` y `coachSummary`, en ningún
// sitio.
//
// El efecto comercial era el peor posible: acabábamos de desplegar una oferta
// que invita a comprar `adaptive_coach`, y quien la aceptara habría recibido,
// sobre lo que ya tenía, una lista más.
//
// Estos tests fijan las dos direcciones. Que Pro los VEA, y que Free NO — sin
// que el cliente decida nunca de qué plan se trata: renderiza lo que llegó.

const PRO_FULL = {
  ...FREE_PAYLOAD,
  mission: {
    ...FREE_PAYLOAD.mission,
    coachLine: { headline: "Short clips first", why: "Accuracy before speed.", focus: "gist" },
  },
  session: {
    ...FREE_PAYLOAD.session,
    skillsSkipped: [{ skill: "writing", why: "Two sessions ago; nothing has aged." }],
  },
  expectedOutcome: {
    certainties: [{ skill: "reading", text: "Reading: 8 more answers behind the estimate." }],
    projections: [{ skill: "listening", text: "Listening: likely +0.2 with two sittings." }],
  },
  roi: { best: { skill: "listening", because: ["Biggest gap to target.", "Cheapest minutes to move."] } },
  coachSummary: { headline: "Twenty minutes, two skills", body: "Listening leads because it is furthest behind." },
  proLock: undefined,
};

describe("A002-01 — the four fields Pro buys and could not see", () => {
  it("renders coachLine for Pro, in the slot the offer occupies for Free", () => {
    render(<HomeDashboard initial={initialWith(PRO_FULL) as never} userId="u1" />);
    expect(screen.getByText("Short clips first")).toBeTruthy();
    expect(screen.getByText("Accuracy before speed.")).toBeTruthy();
    expect(screen.getByText("gist")).toBeTruthy();
    // ...y por tanto NO la oferta: son mutuamente excluyentes por construcción.
    expect(screen.queryByText("Know what to train first")).toBeNull();
  });

  it("renders roi — which skill to train first, and why", () => {
    render(<HomeDashboard initial={initialWith(PRO_FULL) as never} userId="u1" />);
    expect(screen.getByText("Train first")).toBeTruthy();
    expect(screen.getByText("Biggest gap to target.")).toBeTruthy();
    expect(screen.getByText("Cheapest minutes to move.")).toBeTruthy();
  });

  it("renders skillsSkipped — what NOT to train", () => {
    render(<HomeDashboard initial={initialWith(PRO_FULL) as never} userId="u1" />);
    expect(screen.getByText("Leave for another day")).toBeTruthy();
    expect(screen.getByText(/nothing has aged/)).toBeTruthy();
  });

  it("renders coachSummary — the plan restated in the coach's words", () => {
    render(<HomeDashboard initial={initialWith(PRO_FULL) as never} userId="u1" />);
    expect(screen.getByText("Twenty minutes, two skills")).toBeTruthy();
    expect(screen.getByText(/furthest behind/)).toBeTruthy();
  });

  it("keeps rendering projections, which already worked", () => {
    render(<HomeDashboard initial={initialWith(PRO_FULL) as never} userId="u1" />);
    expect(screen.getByText(/likely \+0\.2 with two sittings/)).toBeTruthy();
  });

  it("leaks NONE of the four to a Free plan", () => {
    render(<HomeDashboard initial={initialWith(FREE_PAYLOAD) as never} userId="u1" />);
    for (const t of ["Short clips first", "Train first", "Leave for another day", "Twenty minutes, two skills"]) {
      expect(screen.queryByText(t)).toBeNull();
    }
    // Free sí ve la oferta y su propio diagnóstico.
    expect(screen.getByText("Know what to train first")).toBeTruthy();
    expect(screen.getByText("Fill in the picture")).toBeTruthy();
  });

  it("does not break on the shapes Free actually receives", () => {
    // Free recibe skillsSkipped como [] (no null) y roi/coachSummary como null.
    // Un render que confunda "vacío porque no hay" con "vacío porque es Pro"
    // pintaría cabeceras huérfanas.
    render(<HomeDashboard initial={initialWith(FREE_PAYLOAD) as never} userId="u1" />);
    expect(screen.queryByText("Train first")).toBeNull();
    expect(screen.queryByText("Leave for another day")).toBeNull();
  });

  it("renders a Pro payload where only SOME fields are populated", () => {
    // El backend puede tener coachLine y no tener roi. Ninguna cabecera puede
    // quedarse sin su contenido.
    const partial = { ...PRO_FULL, roi: null, coachSummary: null, session: { ...PRO_FULL.session, skillsSkipped: [] } };
    render(<HomeDashboard initial={initialWith(partial) as never} userId="u1" />);
    expect(screen.getByText("Short clips first")).toBeTruthy();
    expect(screen.queryByText("Train first")).toBeNull();
    expect(screen.queryByText("Leave for another day")).toBeNull();
    expect(screen.queryByText("Twenty minutes, two skills")).toBeNull();
  });

  it("the client never decides the plan — remove the fields and nothing renders", () => {
    const stripped = { ...PRO_FULL, mission: { ...PRO_FULL.mission, coachLine: null }, roi: null, coachSummary: null,
                       session: { ...PRO_FULL.session, skillsSkipped: [] } };
    render(<HomeDashboard initial={initialWith(stripped) as never} userId="u1" />);
    expect(screen.queryByText("Short clips first")).toBeNull();
    expect(screen.queryByText("Train first")).toBeNull();
  });
});
