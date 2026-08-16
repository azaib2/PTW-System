import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string | null; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bgapp flex flex-col items-center justify-center px-6 text-center">
          <div className="text-navy font-bold text-lg mb-2">Something went wrong</div>
          <p className="text-sm text-slate-500 mb-4 max-w-sm">
            The app hit an unexpected error and couldn't continue. Your data is safe — nothing was lost.
            Try reloading the page.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, message: null }); window.location.reload(); }}
            className="bg-brand text-white font-semibold py-3 px-6 rounded-lg"
          >
            Reload
          </button>
          {this.state.message && (
            <p className="text-xs text-slate-400 mt-4 max-w-sm break-words">{this.state.message}</p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
