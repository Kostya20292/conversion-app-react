import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AccountApiKeySection } from './AccountApiKeySection';

describe('AccountApiKeySection', () => {
  it('маскирует ключ, пока его не показали', () => {
    render(<AccountApiKeySection onNotify={() => undefined} />);

    const keyValue = screen.getByText(/cv_live_/);

    expect(keyValue.textContent).toMatch(/^cv_live_•+$/);
  });

  it('просит подтвердить перевыпуск: старый ключ перестанет работать', async () => {
    const user = userEvent.setup();

    render(<AccountApiKeySection onNotify={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Перевыпустить' }));

    expect(screen.getByText(/Старый ключ перестанет работать/)).toBeInTheDocument();
  });
});
