import React from "react";

type State = { hasError: boolean; message?: string; stack?: string };

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error?.message || error), stack: String(error?.stack || "") };
  }

  componentDidCatch(error: any, info: any) {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="p-6">
        <h1 className="text-red-600 font-semibold mb-2">Something went wrong.</h1>
        <p className="text-sm mb-2">{this.state.message}</p>
        <pre className="text-xs bg-gray-100 p-3 rounded">{this.state.stack}</pre>
        <button
          className="mt-3 px-3 py-2 bg-black text-white rounded"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}
