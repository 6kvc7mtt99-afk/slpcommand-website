/** @vitest-environment happy-dom */
//
// FASE MONETIZATION-BOUNDARY-001 (mitad cliente) — la oferta que sustituye a un
// campo retenido.
//
// ── QUÉ SE ROMPIÓ, Y POR QUÉ NO SE VEÍA ────────────────────────────────────
//
// El backend lleva desde `aece55b` en producción devolviendo `proLock` a las
// cuentas Free, verificado en vivo. `TodaySessionCard` estaba preparada para
// pintarlo. Y aun así no aparecía nada: `decodeSessionToday` — el único punto
// por el que pasa la respuesta, tanto en servidor como en cliente — no copiaba
// `proLock` al objeto que construye. El campo se perdía entre la API y la UI,
// en una línea que nadie había escrito.
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
import { TodaySessionCard } from "../../components/home/TodaySessionCard";
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

describe("TodaySessionCard — the offer is rendered where the coaching was", () => {
  it("shows the offer to a Free learner, linking to the subscription page", () => {
    render(<TodaySessionCard today={decodeSessionToday(FREE_PAYLOAD)} />);

    expect(screen.getByText("Know what to train first")).toBeTruthy();
    expect(screen.getByText(/ranks today's plan/)).toBeTruthy();

    // Es un enlace real, no un div con onClick: navegable con teclado y
    // anunciado como enlace por un lector de pantalla, sin trabajo extra.
    const link = screen.getByRole("link", { name: /Know what to train first/i });
    expect(link.getAttribute("href")).toBe("/subscription");
  });

  it("shows no offer to a plan that had nothing withheld", () => {
    render(<TodaySessionCard today={decodeSessionToday(PRO_PAYLOAD)} />);
    expect(screen.queryByText("Know what to train first")).toBeNull();
    // ...y sí muestra el coaching que ese plan sí incluye.
    expect(screen.getByText("Short clips")).toBeTruthy();
  });

  it("does not break when the coaching line is withheld", () => {
    // La regresión que este cambio podía introducir: `coach.headline` sobre
    // null. La tarjeta tiene que seguir pintando la sesión.
    render(<TodaySessionCard today={decodeSessionToday(FREE_PAYLOAD)} />);
    expect(screen.getByText("Fill in the picture")).toBeTruthy();
    expect(screen.getByText(/Yesterday slipped/)).toBeTruthy();
  });

  it("renders nothing at all when there is no session to show", () => {
    expect(render(<TodaySessionCard today={null} />).container.firstChild).toBeNull();
  });

  it("never lets the client decide the plan — the offer comes only from the payload", () => {
    // El frontend no puede convertirse en fuente de verdad del entitlement.
    // Sin `proLock` en la respuesta no hay oferta, dijera lo que dijera
    // cualquier estado local.
    const withoutOffer = decodeSessionToday({ ...FREE_PAYLOAD, proLock: null });
    render(<TodaySessionCard today={withoutOffer} />);
    expect(screen.queryByText("Know what to train first")).toBeNull();
  });
});

// ── LA RAZÓN POR LA QUE ESTE BLOQUE EXISTE ─────────────────────────────────
//
// Los tests de arriba pasaban, el decodificador llevaba la oferta y la página
// desplegada seguía sin mostrarla. `TodaySessionCard` NO ESTÁ MONTADA EN NINGÚN
// SITIO: `grep -rn TodaySessionCard app components` sólo encuentra su propia
// definición. La home real es `HomeDashboard`, que pinta la misión en línea y
// nunca la importa.
//
// La oferta se había escrito en un componente que nadie usa, así que no habría
// aparecido por muchas veces que se desplegara. Estos tests son sobre la ruta
// que un usuario recorre de verdad, y fallarían si alguien volviera a mover el
// render a un componente huérfano.

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
