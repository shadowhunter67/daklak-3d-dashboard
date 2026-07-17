export type MobileSheetState = 'closed' | 'peek' | 'expanded';
export type MobileSheetContent = 'summary' | 'selection';

export interface MobileSheetModel {
  state: MobileSheetState;
  content: MobileSheetContent;
}

export type MobileSheetAction =
  | { type: 'select' }
  | { type: 'clear-selection' }
  | { type: 'toggle' }
  | { type: 'close' }
  | { type: 'show-summary' };

export const initialMobileSheet: MobileSheetModel = {
  state: 'closed',
  content: 'summary',
};

export function reduceMobileSheet(
  model: MobileSheetModel,
  action: MobileSheetAction,
): MobileSheetModel {
  switch (action.type) {
    case 'select':
      return { state: 'peek', content: 'selection' };
    case 'clear-selection':
      return { state: 'closed', content: 'summary' };
    case 'toggle':
      return {
        ...model,
        state: model.state === 'expanded' ? 'peek' : 'expanded',
      };
    case 'close':
      return { ...model, state: 'closed' };
    case 'show-summary':
      return { state: model.state === 'closed' ? 'peek' : model.state, content: 'summary' };
  }
}
