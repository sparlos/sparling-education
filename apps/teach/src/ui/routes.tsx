// The teacher app's screens, each at its own URL under /teach/. Every screen
// loads what it needs from its URL's params through the teacher port, so a
// reload, a bookmark or a shared link opens the same screen. Everything for
// one class lives under /classes/<classId>/.
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Loader } from "@repo/ui/loader";
import { Stack } from "@repo/ui/stack";
import { Text } from "@repo/ui/text";
import { Title } from "@repo/ui/title";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type ErrorComponentProps,
  notFound,
  type RouterHistory,
  useParams,
  useRouter,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { NotFound, type TeacherPort } from "../platform/ports.ts";
import { ClassesScreen } from "./Classes.tsx";
import { DashboardScreen } from "./Dashboard.tsx";
import { EvidenceScreen } from "./Evidence.tsx";
import { ButtonLink } from "./links.tsx";
import { PlayScreen } from "./PlayScreen.tsx";

const root = createRootRouteWithContext<{ teacher: TeacherPort }>()({});

const classesRoute = createRoute({
  getParentRoute: () => root,
  path: "/",
  loader: ({ context: { teacher } }) => teacher.classes(),
  component: function Classes() {
    const list = classesRoute.useLoaderData();
    const { teacher } = classesRoute.useRouteContext();
    const router = useRouter();
    return (
      <ClassesScreen
        list={list}
        onCreate={async (draft) => {
          await teacher.createClass(draft);
          await router.invalidate();
        }}
      />
    );
  },
  ...loading("your classes"),
});

const classRoute = createRoute({
  getParentRoute: () => root,
  path: "classes/$classId",
});

const dashboardRoute = createRoute({
  getParentRoute: () => classRoute,
  path: "/",
  // `game|id`: the misconception open in the strip.
  validateSearch: (search): { misconception?: string } =>
    typeof search.misconception === "string"
      ? { misconception: search.misconception }
      : {},
  loader: async ({ context: { teacher }, params: { classId } }) => {
    const [cls, dashboard] = await found(
      Promise.all([teacher.class(classId), teacher.dashboard(classId)]),
    );
    return { cls, dashboard };
  },
  component: function Dashboard() {
    const { cls, dashboard } = dashboardRoute.useLoaderData();
    const { misconception } = dashboardRoute.useSearch();
    const navigate = dashboardRoute.useNavigate();
    return (
      <DashboardScreen
        cls={cls}
        dashboard={dashboard}
        misconception={misconception ?? null}
        onMisconception={(key) =>
          // Opening and closing one doesn't pile up history, or scroll.
          navigate({
            search: key ? { misconception: key } : {},
            replace: true,
            resetScroll: false,
            state: (before) => before,
          })
        }
      />
    );
  },
  ...loading("the class's results", { home: true, label: "Your classes" }),
});

const evidenceRoute = createRoute({
  getParentRoute: () => classRoute,
  path: "students/$studentId/expectations/$expectationId",
  loader: async ({
    context: { teacher },
    params: { classId, studentId, expectationId },
  }) => {
    const [cls, evidence] = await found(
      Promise.all([
        teacher.class(classId),
        teacher.evidence(classId, studentId, expectationId),
      ]),
    );
    return { cls, evidence };
  },
  component: function Evidence() {
    const { cls, evidence } = evidenceRoute.useLoaderData();
    return <EvidenceScreen cls={cls} evidence={evidence} />;
  },
  ...loading("the student's evidence", { label: "The class's results" }),
});

const playRoute = createRoute({
  getParentRoute: () => classRoute,
  path: "students/$studentId/plays/$playId",
  loader: ({ context: { teacher }, params: { classId, studentId, playId } }) =>
    found(teacher.play(classId, studentId, playId)),
  component: function Play() {
    const play = playRoute.useLoaderData();
    const { classId } = playRoute.useParams();
    return <PlayScreen classId={classId} play={play} />;
  },
  ...loading("the play", { label: "The class's results" }),
});

const routeTree = root.addChildren([
  classesRoute,
  classRoute.addChildren([dashboardRoute, evidenceRoute, playRoute]),
]);

export function teacherRouter({
  teacher,
  history,
}: {
  teacher: TeacherPort;
  /** The browser's own by default; tests pass a memory history. */
  history?: RouterHistory;
}) {
  return createRouter({
    routeTree,
    context: { teacher },
    history,
    // Vite's `base` (vite.config.ts). Not `import.meta.env.BASE_URL`, which
    // is "/" under Vitest.
    basepath: "/teach",
    scrollRestoration: true,
    // A new screen starts at its top, and an old one where it was left, at
    // once, despite the page's smooth scrolling (@repo/ui's global.css).
    scrollRestorationBehavior: "instant",
    defaultPendingMs: 300,
    defaultNotFoundComponent: NotFoundScreen,
    defaultErrorComponent: (props) => (
      <Failed
        what="this page"
        {...props}
        up={{ home: true, label: "Your classes" }}
      />
    ),
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof teacherRouter>;
  }
}

/** Turns the port's `NotFound` into the router's, for the "not found" screen. */
async function found<T>(loading: Promise<T>): Promise<T> {
  try {
    return await loading;
  } catch (error) {
    if (error instanceof NotFound) throw notFound();
    throw error;
  }
}

/** Where a screen that couldn't load goes back up to. */
interface Up {
  /** Up to the teacher's classes, rather than the class's dashboard. */
  home?: true;
  label: string;
}

/** A screen's loader while it loads, and "try again" when it can't. */
function loading(what: string, up?: Up) {
  return {
    pendingComponent: () => <Loader label={`Loading ${what}`} size="md" />,
    errorComponent: (props: ErrorComponentProps) => (
      <Failed what={what} up={up} {...props} />
    ),
  };
}

function Failed({
  what,
  up,
  error,
}: ErrorComponentProps & { what: string; up?: Up }) {
  const router = useRouter();
  useEffect(() => {
    console.error(`[teach] Couldn't load ${what}`, error);
  }, [what, error]);
  return (
    <Stack gap="lg">
      {up && (
        <div>
          <UpLink up={up} />
        </div>
      )}
      <Card variant="soft" tone="educator">
        <Stack gap="xs" align="flex-start">
          <Text>{`${capitalised(what)} couldn't be loaded.`}</Text>
          <Button variant="secondary" onClick={() => router.invalidate()}>
            Try again
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}

function UpLink({ up }: { up: Up }): ReactNode {
  const { classId } = useParams({ strict: false });
  if (up.home || !classId)
    return (
      <ButtonLink to="/" variant="subtle">
        {up.label}
      </ButtonLink>
    );
  return (
    <ButtonLink to="/classes/$classId" params={{ classId }} variant="subtle">
      {up.label}
    </ButtonLink>
  );
}

/** A class, student, expectation or play the teacher can't see, or no such page. */
function NotFoundScreen() {
  return (
    <Stack gap="sm" align="flex-start">
      <Title order={1}>Not found</Title>
      <Text>
        This page isn't here. It may not be one of your classes, or the link may
        be wrong.
      </Text>
      <ButtonLink to="/" tone="educator">
        Your classes
      </ButtonLink>
    </Stack>
  );
}

function capitalised(text: string) {
  return text.charAt(0).toLocaleUpperCase("en-CA") + text.slice(1);
}
