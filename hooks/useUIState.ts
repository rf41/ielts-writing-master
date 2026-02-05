import { useReducer } from 'react';
import { TaskType } from '../types';

/**
 * UI State Types
 */
export type UIState = {
  modals: {
    profile: boolean;
    apiSettings: boolean;
    donation: boolean;
    guideline: boolean;
  };
  activeTab: TaskType | 'admin';
  sidebarVisible: boolean;
};

type UIAction =
  | { type: 'OPEN_MODAL'; modal: keyof UIState['modals'] }
  | { type: 'CLOSE_MODAL'; modal: keyof UIState['modals'] }
  | { type: 'CLOSE_ALL_MODALS' }
  | { type: 'SET_TAB'; tab: TaskType | 'admin' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; visible: boolean };

/**
 * Initial UI State
 */
const initialState: UIState = {
  modals: {
    profile: false,
    apiSettings: false,
    donation: false,
    guideline: false
  },
  activeTab: TaskType.TASK_1,
  sidebarVisible: false
};

/**
 * UI State Reducer
 */
function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return {
        ...state,
        modals: { ...state.modals, [action.modal]: true }
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        modals: { ...state.modals, [action.modal]: false }
      };
    case 'CLOSE_ALL_MODALS':
      return {
        ...state,
        modals: {
          profile: false,
          apiSettings: false,
          donation: false,
          guideline: false
        }
      };
    case 'SET_TAB':
      return {
        ...state,
        activeTab: action.tab
      };
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarVisible: !state.sidebarVisible
      };
    case 'SET_SIDEBAR':
      return {
        ...state,
        sidebarVisible: action.visible
      };
    default:
      return state;
  }
}

/**
 * Custom hook for UI state management
 * Consolidates multiple useState hooks into a single reducer
 */
export const useUIState = () => {
  const [state, dispatch] = useReducer(uiReducer, initialState);
  
  return {
    state,
    openModal: (modal: keyof UIState['modals']) => 
      dispatch({ type: 'OPEN_MODAL', modal }),
    closeModal: (modal: keyof UIState['modals']) => 
      dispatch({ type: 'CLOSE_MODAL', modal }),
    closeAllModals: () => 
      dispatch({ type: 'CLOSE_ALL_MODALS' }),
    setTab: (tab: TaskType | 'admin') => 
      dispatch({ type: 'SET_TAB', tab }),
    toggleSidebar: () => 
      dispatch({ type: 'TOGGLE_SIDEBAR' }),
    setSidebar: (visible: boolean) =>
      dispatch({ type: 'SET_SIDEBAR', visible })
  };
};
