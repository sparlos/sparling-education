// The teacher app's screens, each at its own URL under /teach/. Every screen
// loads what it needs from its URL's params through the teacher port, so a
// reload, a bookmark or a shared link opens the same screen. Everything for
// one class lives under /classes/<classId>/. "/" opens the class the teacher
// last had open, or their only one, or makes a first.
import { defaultClassColour, nextClassColour } from "@repo/tokens";
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { ClassColourScope } from "@repo/ui/class-colour-scope";
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
  Outlet,
  type RouterHistory,
  redirect,
  useParams,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import {
  type Account,
  type Class,
  NotFound,
  type TeacherPort,
} from "../platform/ports.ts";
import { Chrome } from "./Chrome.tsx";
import { DashboardScreen } from "./Dashboard.tsx";
import { ButtonLink } from "./links.tsx";
import { ManageScreen } from "./Manage.tsx";
import { NewClassScreen } from "./NewClass.tsx";
import { PlayScreen } from "./PlayScreen.tsx";
import { ClassQuickAssessScreen } from "./QuickAssess.tsx";
import { StudentScreen } from "./StudentScreen.tsx";

const root = createRootRouteWithContext<{
  teacher: TeacherPort;
  account: Account;
  onSignOut(): void;
}>()({
  component: function Root() {
    const { teacher, account, onSignOut } = root.useRouteContext();
    // The open class's colour, if a class is open, for the sky behind it all.
    const colour = useRouterState({
      select: (state) =>
        (
          state.matches.find((match) => match.routeId === classRoute.id)
            ?.loaderData as { colour?: string } | null | undefined
        )?.colour,
    });
    return (
      <Chrome
        teacher={teacher}
        account={account}
        onSignOut={onSignOut}
        colour={colour}
      >
        <Outlet />
      </Chrome>
    );
  },
});

/** Where this browser remembers the class the teacher last opened. */
const lastClassKey = "teach.last-class";

function lastClass(): string | null {
  try {
    return localStorage.getItem(lastClassKey);
  } catch {
    return null;
  }
}

function rememberClass(classId: string) {
  try {
    localStorage.setItem(lastClassKey, classId);
  } catch {
    // Opens the first class next time; nothing is lost.
  }
}

/** The new-class form, for a teacher with no classes or the switcher's "New class". */
function NewClassRoute({
  first,
  classes = [],
}: {
  first: boolean;
  /** The teacher's classes, whose colours a new one avoids. */
  classes?: Class[];
}) {
  const router = useRouter();
  const { teacher } = router.options.context;
  return (
    <NewClassScreen
      first={first}
      colour={nextClassColour(
        classes.filter((c) => !c.demo).map((c) => c.colour),
      )}
      onCreate={async (draft) => {
        const made = await teacher.createClass(draft);
        await router.navigate({
          to: "/classes/$classId",
          params: { classId: made.id },
        });
      }}
      onCancel={() => router.history.back()}
    />
  );
}

const indexRoute = createRoute({
  getParentRoute: () => root,
  path: "/",
  loader: async ({ context: { teacher } }) => {
    const list = await teacher.classes();
    const open = list.find((c) => c.id === lastClass()) ?? list[0];
    if (open)
      throw redirect({
        to: "/classes/$classId",
        params: { classId: open.id },
        replace: true,
      });
  },
  component: () => <NewClassRoute first />,
  ...loading("your classes"),
});

const newClassRoute = createRoute({
  getParentRoute: () => root,
  path: "new",
  loader: ({ context: { teacher } }) => teacher.classes(),
  component: function NewClass() {
    return (
      <NewClassRoute first={false} classes={newClassRoute.useLoaderData()} />
    );
  },
  ...loading("your classes", { home: true, label: "Your classes" }),
});

// Every screen of a class is in its class colour. A class that can't be
// loaded leaves its screen to say so, in the brand's colour.
const classRoute = createRoute({
  getParentRoute: () => root,
  path: "classes/$classId",
  loader: ({ context: { teacher }, params: { classId } }) =>
    teacher.class(classId).catch(() => null),
  component: function InClass() {
    const cls = classRoute.useLoaderData();
    return (
      <ClassColourScope colour={cls?.colour ?? defaultClassColour}>
        <Outlet />
      </ClassColourScope>
    );
  },
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
    const [cls, dashboard, all] = await found(
      Promise.all([
        teacher.class(classId),
        teacher.dashboard(classId),
        teacher.classes(),
      ]),
    );
    return { cls, dashboard, all };
  },
  component: function Dashboard() {
    const { cls, dashboard, all } = dashboardRoute.useLoaderData();
    const { misconception } = dashboardRoute.useSearch();
    const navigate = dashboardRoute.useNavigate();
    const { teacher } = dashboardRoute.useRouteContext();
    const router = useRouter();
    useEffect(() => rememberClass(cls.id), [cls.id]);
    return (
      <DashboardScreen
        cls={cls}
        classes={all}
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
        onRecognise={async (studentId, trait) => {
          await teacher.recognise(cls.id, studentId, trait);
          await router.invalidate();
        }}
        share={{
          switchGame: async (slug, on) => {
            await teacher.switchGame(cls.id, slug, on);
            await router.invalidate();
          },
        }}
        timer={{
          start: async (minutes) => {
            await teacher.startTimer(cls.id, minutes);
            await router.invalidate();
          },
          addTime: async () => {
            await teacher.addTime(cls.id);
            await router.invalidate();
          },
          stop: async () => {
            await teacher.stopTimer(cls.id);
            await router.invalidate();
          },
        }}
        demo={{
          viewAsStudent: () => teacher.viewDemoAsStudent(),
          delete: async () => {
            await teacher.deleteDemoClass();
            await navigate({ to: "/", replace: true });
          },
        }}
      />
    );
  },
  ...loading("the class's results", { home: true, label: "Your classes" }),
});

const manageRoute = createRoute({
  getParentRoute: () => classRoute,
  path: "manage",
  loader: async ({ context: { teacher }, params: { classId } }) => {
    const [cls, students] = await found(
      Promise.all([teacher.class(classId), teacher.students(classId)]),
    );
    return { cls, students };
  },
  component: function Manage() {
    const { cls, students } = manageRoute.useLoaderData();
    const { teacher } = manageRoute.useRouteContext();
    const router = useRouter();
    /** Makes the change, then shows the class as it now is. */
    const then = async (change: Promise<unknown>) => {
      await change;
      await router.invalidate();
    };
    return (
      <ManageScreen
        cls={cls}
        students={students}
        actions={{
          setColour: (colour) => then(teacher.setClassColour(cls.id, colour)),
          setGrade: (studentId, grade) =>
            then(teacher.setStudentGrade(cls.id, studentId, grade)),
          remove: (studentId) => then(teacher.removeStudent(cls.id, studentId)),
        }}
      />
    );
  },
  ...loading("the class", { label: "The class's results" }),
});

const studentRoute = createRoute({
  getParentRoute: () => classRoute,
  path: "students/$studentId",
  // The expectation open on its bands and plays.
  validateSearch: (search): { expectation?: string } =>
    typeof search.expectation === "string"
      ? { expectation: search.expectation }
      : {},
  loaderDeps: ({ search: { expectation } }) => ({ expectation }),
  loader: async ({
    context: { teacher },
    params: { classId, studentId },
    deps: { expectation },
  }) => {
    const [cls, page, assessed, evidence] = await found(
      Promise.all([
        teacher.class(classId),
        teacher.studentPage(classId, studentId),
        teacher.studentQuickAssess(classId, studentId),
        expectation ? teacher.evidence(classId, studentId, expectation) : null,
      ]),
    );
    return { cls, page, assessed, evidence };
  },
  component: function Student() {
    const { cls, page, assessed, evidence } = studentRoute.useLoaderData();
    const { expectation } = studentRoute.useSearch();
    const navigate = studentRoute.useNavigate();
    const { teacher } = studentRoute.useRouteContext();
    const router = useRouter();
    return (
      <StudentScreen
        cls={cls}
        page={page}
        assessed={assessed}
        evidence={evidence}
        open={expectation ?? null}
        // Opening and closing one doesn't pile up history, or scroll.
        onOpen={(id) =>
          navigate({
            search: id ? { expectation: id } : {},
            replace: true,
            resetScroll: false,
            state: (before) => before,
          })
        }
        today={new Date()}
        onRecognise={async (studentId, trait) => {
          await teacher.recognise(cls.id, studentId, trait);
          await router.invalidate();
        }}
      />
    );
  },
  ...loading("the student's page", { label: "The class's results" }),
});

// The evidence screen's old URL, so shared links don't break: the student's
// page, at that expectation.
const evidenceRoute = createRoute({
  getParentRoute: () => classRoute,
  path: "students/$studentId/expectations/$expectationId",
  beforeLoad: ({ params: { classId, studentId, expectationId } }) => {
    throw redirect({
      to: "/classes/$classId/students/$studentId",
      params: { classId, studentId },
      search: { expectation: expectationId },
      replace: true,
    });
  },
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

const quickAssessRoute = createRoute({
  getParentRoute: () => classRoute,
  path: "quick-assess",
  // The student shown on screen.
  validateSearch: (search): { student?: string } =>
    typeof search.student === "string" ? { student: search.student } : {},
  loader: async ({ context: { teacher }, params: { classId } }) => {
    const [cls, assessed] = await found(
      Promise.all([teacher.class(classId), teacher.quickAssess(classId)]),
    );
    return { cls, assessed };
  },
  component: function QuickAssess() {
    const { cls, assessed } = quickAssessRoute.useLoaderData();
    const { student } = quickAssessRoute.useSearch();
    const navigate = quickAssessRoute.useNavigate();
    return (
      <ClassQuickAssessScreen
        cls={cls}
        students={assessed.students}
        shown={student ?? null}
        // Going through the class doesn't pile up history, or scroll.
        onShow={(id) =>
          navigate({
            search: { student: id },
            replace: true,
            resetScroll: false,
            state: (before) => before,
          })
        }
        today={new Date()}
      />
    );
  },
  ...loading("quick assess", { label: "The class's results" }),
});

const routeTree = root.addChildren([
  indexRoute,
  newClassRoute,
  classRoute.addChildren([
    dashboardRoute,
    manageRoute,
    studentRoute,
    evidenceRoute,
    playRoute,
    quickAssessRoute,
  ]),
]);

export function teacherRouter({
  teacher,
  account,
  onSignOut,
  history,
}: {
  teacher: TeacherPort;
  /** The teacher signed in, for the header. */
  account: Account;
  onSignOut(): void;
  /** The browser's own by default; tests pass a memory history. */
  history?: RouterHistory;
}) {
  return createRouter({
    routeTree,
    context: { teacher, account, onSignOut },
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
      <Card variant="soft" tone="accent">
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
      <ButtonLink to="/" tone="accent">
        Your classes
      </ButtonLink>
    </Stack>
  );
}

function capitalised(text: string) {
  return text.charAt(0).toLocaleUpperCase("en-CA") + text.slice(1);
}
