import { render, screen } from '@testing-library/react';
import App from '../App';

// Mock Telegram WebApp
Object.defineProperty(window, 'Telegram', {
  value: {
    WebApp: {
      initData: '',
      initDataUnsafe: {
        user: {
          id: 123456789,
          first_name: 'Test',
          last_name: 'User',
          username: 'testuser',
          language_code: 'en',
        },
        auth_date: Date.now(),
        hash: 'test_hash',
      },
      version: '6.0',
      platform: 'web',
      colorScheme: 'light',
      themeParams: {
        bg_color: '#ffffff',
        text_color: '#000000',
        hint_color: '#999999',
        link_color: '#2481cc',
        button_color: '#2481cc',
        button_text_color: '#ffffff',
        secondary_bg_color: '#f1f1f1',
      },
      isExpanded: true,
      viewportHeight: 600,
      viewportStableHeight: 600,
      headerColor: '#ffffff',
      backgroundColor: '#ffffff',
      isClosingConfirmationEnabled: false,
      BackButton: {
        isVisible: false,
        onClick: vi.fn(),
        offClick: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
      },
      MainButton: {
        text: '',
        color: '#2481cc',
        textColor: '#ffffff',
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        setText: vi.fn(),
        onClick: vi.fn(),
        offClick: vi.fn(),
        show: vi.fn(),
        hide: vi.fn(),
        enable: vi.fn(),
        disable: vi.fn(),
        showProgress: vi.fn(),
        hideProgress: vi.fn(),
        setParams: vi.fn(),
      },
      HapticFeedback: {
        impactOccurred: vi.fn(),
        notificationOccurred: vi.fn(),
        selectionChanged: vi.fn(),
      },
      ready: vi.fn(),
      expand: vi.fn(),
      close: vi.fn(),
      sendData: vi.fn(),
      openLink: vi.fn(),
      openTelegramLink: vi.fn(),
      openInvoice: vi.fn(),
      showPopup: vi.fn(),
      showAlert: vi.fn(),
      showConfirm: vi.fn(),
      showScanQrPopup: vi.fn(),
      closeScanQrPopup: vi.fn(),
      readTextFromClipboard: vi.fn(),
      requestWriteAccess: vi.fn(),
      requestContact: vi.fn(),
    },
  },
  writable: true,
});

describe('App', () => {
  test('renders main menu', () => {
    render(<App />);
    
    expect(screen.getByText('♔ Шахматы')).toBeInTheDocument();
    expect(screen.getByText('🤖 Играть против ИИ')).toBeInTheDocument();
    expect(screen.getByText('🌐 Играть онлайн')).toBeInTheDocument();
    expect(screen.getByText('📚 История партий')).toBeInTheDocument();
    expect(screen.getByText('👤 Профиль')).toBeInTheDocument();
  });
});

