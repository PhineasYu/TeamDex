import { ArrowLeft, Briefcase } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AvatarBubble, ErrorNote, Pill, Spinner } from '../../components/ui';
import { api, type Person } from '../../lib/api';
import { useData } from '../../lib/hooks';
import { getPendingToken, homeFor, setPendingToken, setSession, type Role } from '../../lib/session';
import { unlockAudio } from '../../lib/sound';

export function JoinPick() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [hrMode, setHrMode] = useState(false);
  const { data, loading, error } = useData(async () => {
    const company = await api.getCompanyByCode(code);
    if (!company) return { company: null, people: [] as Person[] };
    return { company, people: await api.listPeople(company.id) };
  }, [code]);

  const pick = (p: Person, asHr = false) => {
    if (!data?.company) return;
    unlockAudio();
    const role: Role = asHr ? 'hr' : p.kind === 'newcomer' ? 'newcomer' : 'colleague';
    setSession({ companyId: data.company.id, joinCode: data.company.join_code, personId: p.id, role });
    const pending = getPendingToken();
    if (pending) {
      setPendingToken(null);
      nav(`/c/${pending}`, { replace: true });
      return;
    }
    if (role === 'colleague' && !p.card_claimed) nav('/me/edit', { replace: true });
    else nav(homeFor(role), { replace: true });
  };

  const newcomers = data?.people.filter((p) => p.kind === 'newcomer') ?? [];
  const colleagues = data?.people.filter((p) => p.kind === 'colleague') ?? [];
  const hrPeople = data?.people.filter((p) => p.is_hr) ?? [];

  return (
    <div className="page page-bare">
      <Link to="/" className="mb-2 inline-flex min-h-[44px] items-center gap-1 text-[15px] font-semibold text-muted">
        <ArrowLeft size={18} /> Back
      </Link>
      {loading && <Spinner />}
      {error && <ErrorNote>Something went wrong loading the team. Refresh and try again.</ErrorNote>}
      {data && !data.company && (
        <div className="mt-6">
          <h1 className="text-hero">Hmm.</h1>
          <div className="mt-3">
            <ErrorNote>We couldn't find that team. Check the code with your HR.</ErrorNote>
          </div>
        </div>
      )}
      {data?.company && (
        <>
          <p className="text-[14px] font-semibold text-muted">{data.company.name}</p>
          <h1 className="text-hero mt-1">{hrMode ? 'Which HR person are you?' : 'Who are you?'}</h1>
          {getPendingToken() && !hrMode && <p className="mt-2 rounded-2xl bg-mint px-4 py-3 text-[15px] font-medium">Pick yourself and we'll collect the card you just scanned.</p>}

          {hrMode ? (
            <PeopleList people={hrPeople} onPick={(p) => pick(p, true)} />
          ) : (
            <>
              {newcomers.length > 0 && (
                <>
                  <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">New here</h2>
                  <PeopleList people={newcomers} onPick={(p) => pick(p)} />
                </>
              )}
              <h2 className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">The team</h2>
              <PeopleList people={colleagues} onPick={(p) => pick(p)} />
            </>
          )}

          <div className="mt-8">
            {hrMode ? (
              <Pill variant="secondary" block onClick={() => setHrMode(false)}>
                Back to everyone
              </Pill>
            ) : (
              <Pill variant="secondary" block onClick={() => setHrMode(true)}>
                <Briefcase size={18} /> I'm from HR
              </Pill>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PeopleList({ people, onPick }: { people: Person[]; onPick: (p: Person) => void }) {
  return (
    <ul className="flex flex-col gap-2">
      {people.map((p) => (
        <li key={p.id}>
          <button type="button" onClick={() => onPick(p)} className="flex min-h-[64px] w-full items-center gap-3 rounded-[22px] bg-white px-3 py-2 text-left transition-transform active:scale-[.98]">
            <AvatarBubble person={p} size={48} />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-bold leading-tight">{p.display_name}</span>
              <span className="block truncate text-[14px] text-muted">{p.role_title}</span>
            </span>
            {p.kind === 'newcomer' && <span className="rounded-full bg-lime px-2.5 py-0.5 text-[12px] font-bold">New</span>}
            {p.kind === 'colleague' && !p.card_claimed && <span className="rounded-full bg-pink px-2.5 py-0.5 text-[12px] font-bold">Claim card</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
