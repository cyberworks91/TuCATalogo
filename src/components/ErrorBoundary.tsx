import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
  }

  private handleReload = () => {
    try {
      localStorage.removeItem('app_active_user');
      sessionStorage.removeItem('app_active_user');
    } catch (e) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-800">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-gray-100 text-center space-y-4">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-gray-900">Algo no salió como esperábamos</h1>
            <p className="text-sm text-gray-600">
              Ocurrió un error inesperado al cargar la aplicación. Hemos preparado un botón para solucionar el problema recargando el catálogo.
            </p>
            {this.state.error && (
              <div className="bg-gray-100 p-3 rounded-xl text-left text-xs font-mono text-gray-700 overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-orange-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-orange-700 transition shadow-md shadow-orange-100"
              >
                Recargar TuCATalogo
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="w-full bg-gray-100 text-gray-700 font-semibold py-2.5 px-4 rounded-xl hover:bg-gray-200 transition"
              >
                Ir a la página principal
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
