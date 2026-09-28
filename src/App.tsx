import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { LiveNotifier } from './components/LiveNotifier';
import { BottomNav, OfflineBanner, RoleGate } from './components/Shell';
import { ToastProvider } from './components/Toast';
import { ColleagueHome } from './features/colleague/ColleagueHome';
import { EditCard } from './features/colleague/EditCard';
import { MyCard } from './features/colleague/MyCard';
import { CollectPage } from './features/collect/CollectPage';
import { DevPage } from './features/dev/DevPage';
import { JoinPick } from './features/entry/JoinPick';
import { Landing } from './features/entry/Landing';
import { HrHome } from './features/hr/HrHome';
import { Impact } from './features/hr/Impact';
import { NewQuest } from './features/hr/NewQuest';
import { TeamList } from './features/hr/TeamList';
import { CardDetail } from './features/newcomer/CardDetail';
import { Party } from './features/newcomer/Party';
import { QuestHome } from './features/newcomer/QuestHome';
import { Quiz } from './features/newcomer/Quiz';
import { useSession } from './lib/session';

function Nav() {
  const session = useSession();
  const { pathname } = useLocation();
  if (!session) return null;
  const inRole = /^\/(quest|me|hr)(\/|$)/.test(pathname) && !pathname.startsWith('/me/edit') && !pathname.startsWith('/quest/card/');
  if (!inRole) return null;
  // HR visiting colleague pages keeps the colleague nav
  const role = pathname.startsWith('/me') ? 'colleague' : session.role;
  return <BottomNav role={role} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <OfflineBanner />
        <LiveNotifier />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/join/:code" element={<JoinPick />} />
          <Route path="/c/:token" element={<CollectPage />} />
          <Route path="/dev" element={<DevPage />} />

          <Route path="/quest" element={<RoleGate allow={['newcomer']}>{(s) => <QuestHome session={s} />}</RoleGate>} />
          <Route path="/quest/card/:personId" element={<RoleGate allow={['newcomer']}>{(s) => <CardDetail session={s} />}</RoleGate>} />
          <Route path="/quest/quiz" element={<RoleGate allow={['newcomer']}>{(s) => <Quiz session={s} />}</RoleGate>} />
          <Route path="/quest/party" element={<RoleGate allow={['newcomer']}>{(s) => <Party session={s} />}</RoleGate>} />

          <Route path="/me" element={<RoleGate allow={['colleague', 'hr']}>{(s) => <ColleagueHome session={s} />}</RoleGate>} />
          <Route path="/me/card" element={<RoleGate allow={['colleague', 'hr']}>{(s) => <MyCard session={s} />}</RoleGate>} />
          <Route path="/me/edit" element={<RoleGate allow={['colleague', 'hr']}>{(s) => <EditCard session={s} />}</RoleGate>} />

          <Route path="/hr" element={<RoleGate allow={['hr']}>{(s) => <HrHome session={s} />}</RoleGate>} />
          <Route path="/hr/new" element={<RoleGate allow={['hr']}>{(s) => <NewQuest session={s} />}</RoleGate>} />
          <Route path="/hr/team" element={<RoleGate allow={['hr']}>{(s) => <TeamList session={s} />}</RoleGate>} />
          <Route path="/hr/impact" element={<RoleGate allow={['hr']}>{(s) => <Impact session={s} />}</RoleGate>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Nav />
      </ToastProvider>
    </BrowserRouter>
  );
}
