import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useSession } from "./lib/session";
import { FullSpinner } from "./components/ui";
import AppShell from "./components/AppShell";
import Welcome from "./pages/Welcome";
import Join from "./pages/Join";
import CreateTeam from "./pages/CreateTeam";
import Calendar from "./pages/Calendar";
import EventDetail from "./pages/EventDetail";
import Board from "./pages/Board";
import Duties from "./pages/Duties";
import Team from "./pages/Team";
import Chat from "./pages/Chat";
import { UnreadProvider } from "./lib/unread";

export default function App() {
  const { loading, team, member } = useSession();
  const location = useLocation();

  if (loading) return <FullSpinner />;

  const signedIn = !!team && !!member;

  return (
    <Routes>
      {/* 認証不要 */}
      <Route path="/join/:code" element={<Join />} />
      <Route
        path="/welcome"
        element={signedIn ? <Navigate to="/" replace /> : <Welcome />}
      />
      <Route
        path="/create"
        element={signedIn ? <Navigate to="/" replace /> : <CreateTeam />}
      />

      {/* 認証必須 */}
      {signedIn ? (
        <Route
          element={
            <UnreadProvider>
              <AppShell />
            </UnreadProvider>
          }
        >
          <Route path="/" element={<Calendar />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/board" element={<Board />} />
          <Route path="/duties" element={<Duties />} />
          <Route path="/team" element={<Team />} />
          <Route path="/event/:id" element={<EventDetail />} />
        </Route>
      ) : (
        <Route
          path="*"
          element={
            <Navigate to="/welcome" replace state={{ from: location.pathname }} />
          }
        />
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
