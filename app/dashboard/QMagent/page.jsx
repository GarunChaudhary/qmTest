// app/dashboard/QMagent/page.jsx
"use client";

import { useEffect, useState } from "react";
import withAuth from "@/components/withAuth";
import dynamic from "next/dynamic";
import CryptoJS from "crypto-js";
import { MdOutlineMultilineChart } from "react-icons/md";
import { BiSolidReport } from "react-icons/bi";
import { IoAddCircleOutline } from "react-icons/io5";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useRouter } from "next/navigation";
const ICON_MAP = {
  MdOutlineMultilineChart,
  BiSolidReport,
};
const normalizeKey = (k) => k.replace("Agent_", "");
const ResponsiveGridLayout = WidthProvider(Responsive);

const CallMetricsDashboard = dynamic(
  () => import("../dashboard1/Interection/callDashbordSummury.jsx"),
  { ssr: false },
);

const CallVolumeTrends = dynamic(
  () => import("../dashboard1/Interection/callVolumeTrends.jsx"),
  { ssr: false },
);

const EvaluationPassFailUI = dynamic(() => import("./evaluationPassFail.jsx"), {
  ssr: false,
});

// Map WidgetKey -> Component
const agentWidgetComponents = {
  CallVolumeTrends,
  EvaluationPassFailUI,
};

const AddWidgetModal = ({ open, widgets, visible, onClose, onSelect }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-xl rounded-2xl p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Add Widget</h2>
        <p className="text-muted-foreground text-sm mb-5">
          You can add widgets from here
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {widgets.map((w) => {
            const Icon = ICON_MAP[w.IconName];

            return (
              <div
                key={w.WidgetKey}
                onClick={() =>
                  !visible.includes(normalizeKey(w.WidgetKey)) && onSelect(w)
                }
                className="relative bg-card border border-border rounded-xl p-4 shadow-sm transition cursor-pointer"
              >
                <div
                  className={
                    visible.includes(normalizeKey(w.WidgetKey))
                      ? "opacity-40 blur-[2px] pointer-events-none"
                      : "hover:shadow-md"
                  }
                >
                  {/* ICON */}
                  <div className="mb-3">
                    {Icon && <Icon className="text-3xl text-primary" />}
                  </div>

                  <h3 className="font-medium">{w.WidgetName}</h3>
                  <p className="text-xs text-muted-foreground">{w.Description}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-secondary hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const QMagent = () => {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [availableWidgets, setAvailableWidgets] = useState([]);
  const [visibleWidgets, setVisibleWidgets] = useState([]);
  const [layouts, setLayouts] = useState({
    lg: [],
    md: [],
    sm: [],
    xs: [],
    xxs: [],
  });
  const [show, setShow] = useState(false);

  useEffect(() => {

    const enc = sessionStorage.getItem("user");
    if (!enc) {
      router.replace("/login");
      return;
    }

    const storedRoles = sessionStorage.getItem("agentRoles");
    if (!storedRoles) return; // wait until roles exist

    const agentRoles = JSON.parse(storedRoles);

    const bytes = CryptoJS.AES.decrypt(enc, "");
    const u = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));

    const currentRoleId = Number(u?.userRoles?.[0]?.roleId);

    // ❌ Not allowed agent
    if (!agentRoles.includes(currentRoleId)) {
      router.replace("/dashboard/dashboard1");
      return;
    }

    setUser(u);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ no dependency
  // Load user dashboard
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const res = await fetch("/api/dashBoard1/user-config?tab=agent", {
        headers: { loggedInUserId: user.userId },
      });

      const data = await res.json();

      setVisibleWidgets(data.widgets.map((w) => w.WidgetKey));
      setLayouts(
        data.layout
          ? JSON.parse(data.layout)
          : { lg: [], md: [], sm: [], xs: [], xxs: [] },
      );
    };

    load();
  }, [user]);

  const fetchAgentWidgets = async () => {
    const res = await fetch("/api/dashBoard1/widgets?tab=agent");
    const data = await res.json();
    setAvailableWidgets(data.widgets || []);
  };

  if (!user) return null;

  return (
    <>
      <div className="flex justify-end px-4 pt-4">
        <button
          className="p-2 rounded-full bg-blue-600 text-white"
          onClick={async () => {
            await fetchAgentWidgets();
            setShow(true);
          }}
        >
          <IoAddCircleOutline size={24} />
        </button>
      </div>

      <CallMetricsDashboard />

      <div className="px-4">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={20}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          compactType="vertical"
          isDraggable={true}
          isResizable={true}
          draggableHandle=".widget-drag-handle"
          draggableCancel=".widget-action-btn"
          resizeHandles={["s", "e", "n", "w", "se", "sw", "ne", "nw"]}
          onLayoutChange={async (_, all) => {
            setLayouts(all);

            await fetch("/api/dashBoard1/user-config", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: user.userId,
                tab: "agent",
                layouts: all,
              }),
            });
          }}
        >
          {visibleWidgets.map((key) => {
            const Widget = agentWidgetComponents[normalizeKey(key)];

            if (!Widget) return null;

            return (
              <div
                key={key}
                className="relative bg-card rounded-xl shadow ring-1 ring-gray-100 group"
              >
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={async () => {
                    setVisibleWidgets((v) => v.filter((x) => x !== key));

                    const updated = { ...layouts };
                    Object.keys(updated).forEach((bp) => {
                      updated[bp] = updated[bp].filter((l) => l.i !== key);
                    });
                    setLayouts(updated);

                    await fetch("/api/dashBoard1/user-config", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId: user.userId,
                        tab: "agent",
                        widgetKey: key,
                        isVisible: false,
                      }),
                    });
                  }}
                  className="
                               absolute top-2 right-2
                               opacity-0 group-hover:opacity-100
                               transition-opacity duration-200
                               bg-card/80 backdrop-blur-sm
                               border border-border
                               text-muted-foreground hover:text-red-500
                               rounded-full w-7 h-7
                               flex items-center justify-center
                               shadow-sm hover:shadow
                             "
                >
                  ✕
                </button>

                <Widget />
              </div>
            );
          })}
        </ResponsiveGridLayout>
      </div>

      <AddWidgetModal
        open={show}
        widgets={availableWidgets}
        visible={visibleWidgets}
        onClose={() => setShow(false)}
        onSelect={async (w) => {
          const key = normalizeKey(w.WidgetKey);
          const index = visibleWidgets.length;

          const newItem = {
            i: key,
            w: w.DefaultW,
            h: w.DefaultH,
            x: (index * w.DefaultW) % 12,
            y: Infinity,
            minW: w.MinW,
            minH: w.MinH,
            maxW: w.MaxW,
            maxH: w.MaxH,
          };

          setVisibleWidgets([...visibleWidgets, key]);

          const makeItem = (cols) => ({
            i: key,
            w: w.DefaultW,
            h: w.DefaultH,
            x: (index * w.DefaultW) % cols,
            y: Infinity,
            minW: w.MinW,
            minH: w.MinH,
            maxW: w.MaxW,
            maxH: w.MaxH,
          });

          const updatedLayouts = {
            lg: [...(layouts.lg || []), makeItem(12)],
            md: [...(layouts.md || []), makeItem(10)],
            sm: [...(layouts.sm || []), makeItem(6)],
            xs: [...(layouts.xs || []), makeItem(4)],
            xxs: [...(layouts.xxs || []), makeItem(2)],
          };

          setLayouts(updatedLayouts);

          await fetch("/api/dashBoard1/user-config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.userId,
              tab: "agent",
              widgetKey: key,
              isVisible: true,
            }),
          });

          setShow(false);
        }}
      />
      <style>{`
                .react-resizable-handle {
                  opacity: 0;
                  transition: opacity 0.2s ease-in-out;
                }
              
                .group:hover .react-resizable-handle {
                  opacity: 1;
                }
              `}</style>
    </>
  );
};

export default withAuth(QMagent);

