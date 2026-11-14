// Day closeout (Epic 10): expected vs counted cash, confirm, history, reopen.
import { useEffect, useState } from 'react';
import { Icon } from '../icons.jsx';
import { Sidebar, Topbar } from '../shell.jsx';
import { Field, money, fmtDate, EmptyState } from '../components.jsx';
import { closeoutRepo } from '../lib/repos.js';
import { useAuth } from '../lib/auth.jsx';
import { onDataChanged } from '../lib/dbx.js';
import { t, locale } from '../lib/i18n.jsx';

export const CloseoutPage = ({ onNavigate, badges }) => {
  const { localUser, clinic } = useAuth();
  const currency = clinic?.currency || 'TND';
  const [expected, setExpected] = useState(0);
  const [todayCloseout, setTodayCloseout] = useState(null);
  const [history, setHistory] = useState([]);
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setExpected(await closeoutRepo.expectedCash(new Date()));
    setTodayCloseout(await closeoutRepo.forDate(new Date()));
    setHistory(await closeoutRepo.list());
  };
  useEffect(() => { load(); return onDataChanged(load); }, []);

  const delta = (Number(counted) || 0) - expected;
  const closed = todayCloseout && !todayCloseout.reopened_at;

  const confirm = async () => {
    await closeoutRepo.confirm(new Date(), expected, Number(counted) || 0, notes, localUser.id);
    setCounted(''); setNotes('');
  };

  return (
    <div className="app">
      <Sidebar active="closeout" onNavigate={onNavigate} badges={badges}/>
      <main className="main">
        <Topbar title={<span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>{t('Day closeout')}</span>}
          subtitle={new Date().toLocaleDateString(locale(), { weekday: 'long', month: 'long', day: 'numeric' })}/>
        <div className="content">
          <div className="grid-main-side">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 0 }}>
                <div className="stat">
                  <div className="stat-label">{t('Expected cash')}</div>
                  <div className="stat-value">{money(expected, currency)}</div>
                  <div className="stat-foot">{t('sum of today\'s cash payments')}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t('Counted cash')}</div>
                  <div className="stat-value">{closed ? money(todayCloseout.counted_cash, currency) : counted !== '' ? money(counted, currency) : '—'}</div>
                  <div className="stat-foot">{t('physical drawer count')}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">{t('Delta')}</div>
                  <div className="stat-value" style={{ color: (closed ? todayCloseout.delta : delta) < -0.001 ? 'var(--coral-700)' : (closed ? todayCloseout.delta : delta) > 0.001 ? 'var(--amber-700)' : 'var(--mint-700)' }}>
                    {closed ? money(todayCloseout.delta, currency) : counted !== '' ? money(delta, currency) : '—'}
                  </div>
                  <div className="stat-foot">{t('counted − expected')}</div>
                </div>
              </div>

              {closed ? (
                <div className="card">
                  <div className="card-head"><span className="card-title"><Icon name="check" size={14}/>{t('Day closed')}</span></div>
                  <div className="card-body">
                    <div style={{ fontSize: 13.5, color: 'var(--ink-800)' }}>
                      {t('Closed with {counted} counted ({delta} difference).', {
                        counted: money(todayCloseout.counted_cash, currency), delta: money(todayCloseout.delta, currency),
                      })}
                      {todayCloseout.notes ? ` — ${todayCloseout.notes}` : ''}
                    </div>
                    <button className="btn-ghost" style={{ marginTop: 12 }} onClick={() => closeoutRepo.reopen(todayCloseout.id)}>
                     {t('Reopen day (Dentist action)')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-head"><span className="card-title"><Icon name="clock" size={14}/>{t('Close the day')}</span></div>
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-row">
                      <Field label={t('Counted cash ({currency})', { currency })}>
                        <input type="number" min="0" step="0.5" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="0"/>
                      </Field>
                      <Field label={t('Discrepancy note (optional)')}>
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('e.g. 5 DT change float')}/>
                      </Field>
                    </div>
                    <div>
                      <button className="btn-primary" disabled={counted === ''} onClick={confirm}>
                        <Icon name="check" size={13}/>{t('Confirm closeout')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card table-card">
              <div className="card-head"><span className="card-title">{t('History')}</span></div>
              <table className="dtable">
                <thead><tr><th>{t('Date')}</th><th style={{ textAlign: 'end' }}>{t('Expected')}</th><th style={{ textAlign: 'end' }}>{t('Counted')}</th><th style={{ textAlign: 'end' }}>{t('Delta')}</th></tr></thead>
                <tbody>
                  {history.map((c) => (
                    <tr key={c.id}>
                      <td>{fmtDate(c.closeout_date)}{c.reopened_at && <span className="tag amber" style={{ marginInlineStart: 6 }}>{t('reopened')}</span>}</td>
                      <td className="num" style={{ textAlign: 'end' }}>{money(c.expected_cash, currency)}</td>
                      <td className="num" style={{ textAlign: 'end' }}>{money(c.counted_cash, currency)}</td>
                      <td className="num" style={{ textAlign: 'end', color: c.delta < -0.001 ? 'var(--coral-700)' : c.delta > 0.001 ? 'var(--amber-700)' : 'var(--mint-700)' }}>{money(c.delta, currency)}</td>
                    </tr>
                  ))}
                  {!history.length && <tr><td colSpan={4}><EmptyState icon="clock" title={t('No closeouts yet')}/></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
