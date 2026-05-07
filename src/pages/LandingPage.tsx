import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/state/useAuth";
import SwipeToStart from "@/ui/SwipeToStart";

function Mark() {
  return (
    <div className="landing__mark" aria-hidden="true">
      <svg width="34" height="34" viewBox="0 0 48 48" fill="none">
        <path
          d="M26.6 7.2c7.7 1.6 14 8.2 14.2 16.3.2 9.4-7.4 17.1-16.8 17.1-9.7 0-17.6-8-17-17.8C7.5 14.4 16.2 5 26.6 7.2Z"
          fill="url(#g)"
        />
        <path
          d="M31.9 14.1c-7.2 1.4-12.7 6-15.7 12.4-.6 1.3-1.1 2.7-1.4 4.1 6.7.6 13.5-1.4 18.3-6.2 4.2-4.2 6.3-9.8 6.1-15.3-.2-2.1-1.8-3.3-3.3-3Z"
          fill="rgba(255,255,255,0.72)"
        />
        <defs>
          <linearGradient id="g" x1="10" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F766E" />
            <stop offset="1" stopColor="#14B8A6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, isReady } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    if (user) navigate("/profile", { replace: true });
  }, [user, isReady, navigate]);

  return (
    <div className="landing">
      <div className="landing__hero" aria-hidden="true">
        <div className="landing__heroGlow" />
        <div className="landing__heroPortrait" />
      </div>

      <div className="landing__card">
        <div className="landing__top">
          <Mark />
          <div className="landing__brand">Blood Lyf</div>
        </div>

        <h1 className="landing__title">Healthy Living Begins Here</h1>
        <p className="landing__subtitle">
          Book home sample collection, track your reports, and stay on top of your health in minutes.
        </p>

        <div className="landing__cta">
          <SwipeToStart label="Get started" onComplete={() => navigate("/login")} />
          <div className="landing__hint">Swipe to continue</div>
        </div>
      </div>
    </div>
  );
}

