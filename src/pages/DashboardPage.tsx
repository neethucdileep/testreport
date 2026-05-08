import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/useAuth";
import { ensureUserDocument, getUserProfile, type UserProfile } from "@/lib/profile";

type Card = {
  title: string;
  subtitle: string;
  icon: string;
  disabled?: boolean;
  onClick?: () => void;
};

export default function DashboardPage() {
  const { user, isReady, signOut } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!user) navigate("/login", { replace: true });
  }, [isReady, user, navigate]);

  useEffect(() => {
    async function load() {
      if (!isReady || !user) return;
      setLoading(true);
      try {
        await ensureUserDocument(user.uid, user.phoneNumber ?? "");
        const p = await getUserProfile(user.uid);
        setProfile(p);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [isReady, user]);

  const name = (profile?.name ?? "").trim() || "Guest";

  const cards = useMemo<Card[]>(
    () => [
      {
        title: "My Results",
        subtitle: "View your blood test reports",
        icon: "🧾",
        onClick: () => {
          // Placeholder: wire real results module later
          navigate("/dashboard", { replace: false });
        },
      },
      {
        title: "Edit Profile",
        subtitle: "Update your details anytime",
        icon: "👤",
        onClick: () => navigate("/profile"),
      },
      {
        title: "Family Members",
        subtitle: "Add or update members",
        icon: "👪",
        onClick: () => navigate("/profile"),
      },
      {
        title: "Book Home Collection",
        subtitle: "Coming soon",
        icon: "🚗",
        disabled: true,
      },
      {
        title: "Live Tracking",
        subtitle: "Coming soon",
        icon: "📍",
        disabled: true,
      },
      {
        title: "Support",
        subtitle: "Coming soon",
        icon: "🎧",
        disabled: true,
      },
    ],
    [navigate],
  );

  return (
    <div className="dash">
      <div className="dash__top">
        <div>
          <div className="dash__hello">Hi, {name}</div>
          <div className="dash__sub">Your health, simplified.</div>
        </div>
        <button
          className="dash__signout"
          type="button"
          onClick={async () => {
            await signOut();
            navigate("/login", { replace: true });
          }}
        >
          Sign out
        </button>
      </div>

      <div className="dash__hero">
        <div className="dash__heroTitle">Blood Lyf</div>
        <div className="dash__heroText">Your test results, profile & family—everything in one place.</div>
        <div className="dash__heroPill" aria-hidden="true">
          Uber-like dashboard (modules coming soon)
        </div>
      </div>

      <div className="dash__section">
        <div className="dash__sectionTitle">Quick Actions</div>
        <div className="dash__grid">
          {cards.map((c) => (
            <button
              key={c.title}
              type="button"
              className={`dash__card ${c.disabled ? "is-disabled" : ""}`}
              onClick={c.disabled ? undefined : c.onClick}
              disabled={c.disabled}
            >
              <div className="dash__icon" aria-hidden="true">
                {c.icon}
              </div>
              <div className="dash__cardTitle">{c.title}</div>
              <div className="dash__cardSub">{c.subtitle}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="dash__section">
        <div className="dash__sectionTitle">Recent Results</div>
        <div className="dash__empty">
          {loading ? "Loading..." : "No results yet. Once available, they’ll show up here."}
        </div>
      </div>
    </div>
  );
}

