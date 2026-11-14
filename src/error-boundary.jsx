// Error boundary: a page that crashes while rendering shows a translated
// "Something went wrong" screen (Reload / Back to Home / Report a problem)
// instead of a blank window. Used around each page (reset on navigation,
// via the page key) and once at the root.
import { Component, useState } from 'react';
import { Icon } from './icons.jsx';
import { ReportProblemModal } from './report-problem.jsx';
import { t } from './lib/i18n.jsx';

const errorText = (error, info) => [
  String((error && error.stack) || error),
  info && info.componentStack ? `\nComponent stack:${info.componentStack}` : '',
].join('');

const ErrorScreen = ({ error, info, onHome }) => {
  const [reporting, setReporting] = useState(false);
  const details = errorText(error, info);
  return (
    <div className="error-screen" role="alert">
      <div className="error-card">
        <Icon name="alert-tri" size={28}/>
        <h1>{t('Something went wrong')}</h1>
        <p>{t('This screen hit an unexpected error. Your saved data is safe. Reload the app, or send us a report so we can fix it.')}</p>
        <pre className="error-detail ltr">{String((error && error.message) || error)}</pre>
        <div className="error-actions">
          <button className="btn-primary" onClick={() => window.location.reload()}>{t('Reload')}</button>
          {onHome && <button className="btn-ghost" onClick={onHome}>{t('Back to Home')}</button>}
          <button className="btn-ghost" onClick={() => setReporting(true)}><Icon name="bug" size={13}/>{t('Report a problem')}</button>
        </div>
      </div>
      {reporting && (
        <ReportProblemModal
          initialDescription={`${t('The app showed "Something went wrong".')}\n\n${details}`}
          onClose={() => setReporting(false)}/>
      )}
    </div>
  );
};

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[DocCentral] render error:', (error && error.stack) || error, info && info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <ErrorScreen error={this.state.error} info={this.state.info} onHome={this.props.onHome}/>;
  }
}
