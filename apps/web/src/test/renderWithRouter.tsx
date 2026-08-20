import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';

export const renderWithRouter = (ui: ReactElement, route = '/') => {
  const user = userEvent.setup();

  return {
    user,
    ...render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>),
  };
};
