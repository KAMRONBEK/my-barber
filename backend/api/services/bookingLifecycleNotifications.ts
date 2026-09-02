/**
 * Single source for booking-driven inbox + Expo push copy and recipient routing.
 * Keep in sync with lifecycle callers in BookingServiceClass.
 *
 * Copy is localized per recipient (their `locale` field, synced from the
 * mobile app's language setting — see PUT /client/locale, /barber/locale).
 * A recipient with no stored locale yet (pre-dates this field, or never
 * touched the language setting) falls back to 'uz', matching the mobile
 * app's own DEFAULT_LOCALE (src/lib/i18n.ts).
 */

export type LifecycleRecipientRole = 'barber' | 'client';
export type NotificationLocale = 'uz' | 'ru';

const DEFAULT_NOTIFICATION_LOCALE: NotificationLocale = 'uz';

export function resolveNotificationLocale(
  locale: string | null | undefined
): NotificationLocale {
  return locale === 'ru' ? 'ru' : DEFAULT_NOTIFICATION_LOCALE;
}

/** Per-recipient locale, as read from their stored profile. */
export interface LifecycleLocales {
  barber?: string | null;
  client?: string | null;
}

export interface BookingLifecycleSnapshot {
  id: string;
  barberId: string;
  clientId: string;
  timestamp: string;
}

export interface BookingLifecycleDelivery {
  recipientType: LifecycleRecipientRole;
  notificationType: string;
  title: string;
  body: string;
}

/** Push data uses string fields only for reliable Expo payloads. */
export function buildBookingLifecyclePushData(
  kind: string,
  bookingId: string,
  notificationType: string,
  extra?: Record<string, unknown>
): Record<string, string> {
  const data: Record<string, string> = {
    booking_id: bookingId,
    kind,
    notification_type: notificationType,
  };
  const by = extra?.cancelled_by;
  if (typeof by === 'string') {
    data.cancelled_by = by;
  }
  return data;
}

interface LocalizedCopy {
  title: string;
  body: string;
}

/** Some bodies interpolate the formatted booking time — a function instead of a fixed string. */
type CopyOrBuilder = LocalizedCopy | ((timeLocale: string) => LocalizedCopy);

type LocalizedCopyByLocale = Record<NotificationLocale, CopyOrBuilder>;

function resolveCopy(
  byLocale: LocalizedCopyByLocale,
  locale: NotificationLocale,
  timeLocale: string
): LocalizedCopy {
  const copy = byLocale[locale];
  return typeof copy === 'function' ? copy(timeLocale) : copy;
}

// cancelled_by 'client' -> notify barber; cancelled_by 'barber' -> notify client.
const CANCELLED_COPY: Record<'client' | 'barber', LocalizedCopyByLocale> = {
  client: {
    uz: {
      title: 'Buyurtma bekor qilindi',
      body: 'Mijoz buyurtmani bekor qildi.',
    },
    ru: {
      title: 'Бронирование отменено',
      body: 'Клиент отменил бронирование.',
    },
  },
  barber: {
    uz: {
      title: 'Buyurtma bekor qilindi',
      body: 'Buyurtmangiz sartarosh tomonidan bekor qilindi.',
    },
    ru: {
      title: 'Бронирование отменено',
      body: 'Ваше бронирование отменено барбером.',
    },
  },
};

interface RoleTemplate {
  notificationType: string;
  copy: LocalizedCopyByLocale;
}

const TEMPLATES: Record<
  string,
  Partial<Record<LifecycleRecipientRole, RoleTemplate>>
> = {
  booking_created: {
    barber: {
      notificationType: 'booking_request',
      copy: {
        uz: {
          title: 'Yangi buyurtma',
          body: "Sizda yangi buyurtma so'rovi bor.",
        },
        ru: {
          title: 'Новая заявка',
          body: 'У вас новая заявка на бронирование.',
        },
      },
    },
  },
  booking_confirmed: {
    client: {
      notificationType: 'booking_confirmed',
      copy: {
        uz: (time) => ({
          title: 'Buyurtma tasdiqlandi',
          body: `Uchrashuvingiz ${time} vaqtiga tasdiqlandi`,
        }),
        ru: (time) => ({
          title: 'Бронирование подтверждено',
          body: `Ваша запись подтверждена на ${time}`,
        }),
      },
    },
  },
  booking_declined: {
    client: {
      notificationType: 'booking_declined',
      copy: {
        uz: {
          title: 'Buyurtma rad etildi',
          body: "Sartarosh buyurtma so'rovingizni rad etdi.",
        },
        ru: {
          title: 'Бронирование отклонено',
          body: 'Барбер отклонил вашу заявку.',
        },
      },
    },
  },
  booking_rescheduled: {
    barber: {
      notificationType: 'booking_rescheduled',
      copy: {
        uz: {
          title: "Buyurtma vaqti o'zgartirildi",
          body: "Buyurtma vaqti o'zgartirildi.",
        },
        ru: {
          title: 'Время бронирования перенесено',
          body: 'Время бронирования было изменено.',
        },
      },
    },
    client: {
      notificationType: 'booking_rescheduled',
      copy: {
        uz: (time) => ({
          title: "Buyurtma vaqti o'zgartirildi",
          body: `Uchrashuvingiz ${time} ga ko'chirildi`,
        }),
        ru: (time) => ({
          title: 'Время записи перенесено',
          body: `Ваша запись перенесена на ${time}`,
        }),
      },
    },
  },
  no_show: {
    client: {
      notificationType: 'no_show',
      copy: {
        uz: {
          title: 'Kelmagan deb belgilandi',
          body: 'Uchrashuvingiz kelmagan deb belgilandi.',
        },
        ru: {
          title: 'Отмечено как неявка',
          body: 'Ваша запись отмечена как неявка.',
        },
      },
    },
  },
  booking_completed: {
    client: {
      notificationType: 'booking_completed',
      copy: {
        uz: {
          title: 'Uchrashuv yakunlandi',
          body: 'Tashrifingiz uchun rahmat.',
        },
        ru: {
          title: 'Запись завершена',
          body: 'Спасибо за визит.',
        },
      },
    },
  },
  booking_client_no_show_signal: {
    barber: {
      notificationType: 'booking_client_no_show_signal',
      copy: {
        uz: {
          title: 'Mijoz hali kelmadi',
          body: 'Mijoz hali yetib kelmaganini bildirdi.',
        },
        ru: {
          title: 'Клиент ещё не пришёл',
          body: 'Клиент сообщил, что ещё не пришёл.',
        },
      },
    },
  },
};

export function getBookingLifecycleDeliveries(
  kind: string,
  booking: BookingLifecycleSnapshot,
  extra?: Record<string, unknown>,
  locales?: LifecycleLocales
): BookingLifecycleDelivery[] {
  const timeLocale = new Date(booking.timestamp).toLocaleString();

  if (kind === 'booking_cancelled') {
    const by = extra?.cancelled_by as string | undefined;
    if (by === 'client') {
      const locale = resolveNotificationLocale(locales?.barber);
      return [
        {
          recipientType: 'barber',
          notificationType: 'booking_cancelled',
          ...resolveCopy(CANCELLED_COPY.client, locale, timeLocale),
        },
      ];
    }
    if (by === 'barber') {
      const locale = resolveNotificationLocale(locales?.client);
      return [
        {
          recipientType: 'client',
          notificationType: 'booking_cancelled',
          ...resolveCopy(CANCELLED_COPY.barber, locale, timeLocale),
        },
      ];
    }
    return [];
  }

  const t = TEMPLATES[kind];
  if (!t) return [];

  const out: BookingLifecycleDelivery[] = [];
  if (t.barber) {
    const locale = resolveNotificationLocale(locales?.barber);
    out.push({
      recipientType: 'barber',
      notificationType: t.barber.notificationType,
      ...resolveCopy(t.barber.copy, locale, timeLocale),
    });
  }
  if (t.client) {
    const locale = resolveNotificationLocale(locales?.client);
    out.push({
      recipientType: 'client',
      notificationType: t.client.notificationType,
      ...resolveCopy(t.client.copy, locale, timeLocale),
    });
  }
  return out;
}
