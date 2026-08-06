type SubscriptionConfig = {
  isMonetizationEnabled: boolean;
};

// Единственный переключатель монетизации.
//
// false — подписка полностью скрыта: пейволл не показывается ни в онбординге,
// ни по нажатию, значки Pro не отображаются, а все функции (фото, описание,
// исправление блюда) доступны каждому.
//
// true — возвращает прежнее поведение: доступ к AI-функциям только у Pro.
//
// Флаг читают оба рантайма: клиент через context/SubscriptionContext.tsx и
// серверные функции в convex/meals/analyze/. Менять надо только здесь —
// после правки нужен деплой Convex (`npx convex dev --once`), иначе серверные
// гейты останутся в прежнем состоянии.
//
// Лимит AI-запросов (convex/rateLimit.ts, 50/день) действует независимо от
// этого флага и продолжает защищать от перерасхода.
export const subscriptionConfig: SubscriptionConfig = {
  isMonetizationEnabled: false,
};
