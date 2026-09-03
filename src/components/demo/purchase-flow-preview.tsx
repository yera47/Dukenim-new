import styles from "./purchase-flow-preview.module.css";

const productPhoto = "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260902_100009_9eea2fd0-eeae-4319-b198-50e29d34ada0.png";
const setPhoto = "https://d8j0ntlcm91z4.cloudfront.net/user_3IiQlgoGNOZecy2pHManEfSn5Xj/hf_20260902_100009_587520f3-d4b8-4fd7-ad05-e086a433a0dd.png";

export function PurchaseFlowPreview() {
  return <main className={styles.page}>
    <header className={styles.header}><div className={styles.logo}><span>D</span>dukenim<i>.</i></div><p>Демо-иллюстрации · путь покупки через Dukenim</p></header>
    <section className={styles.intro}><p>ПОКУПАТЕЛЬ ПОКУПАЕТ САМ</p><h1>От ссылки в Instagram<br />до заказа в кабинете.</h1><span>Три блока для главной страницы или презентации клиенту.</span></section>
    <section className={styles.grid}>
      <article className={styles.block}>
        <div className={styles.blockTop}><b>01</b><span>Каталог в телефоне</span></div>
        <div className={styles.phone}><div className={styles.notch}/><div className={styles.storebar}><b>JANYM_DA</b><span>⌕　♡　🛍</span></div><img src={productPhoto} alt="Товар в карточке каталога"/><div className={styles.product}><small>КУРТКА SOFT UTILITY</small><h2>48 900 ₸</h2><div className={styles.size}><span>S</span><span className={styles.selected}>M</span><span>L</span></div><button>В корзину <i>→</i></button></div></div>
        <div className={styles.copy}><h3>Выбор без переписки</h3><p>Фото, цена, размер и наличие сразу в карточке товара.</p></div>
      </article>
      <article className={styles.block}>
        <div className={styles.blockTop}><b>02</b><span>Корзина и способ получения</span></div>
        <div className={styles.phone}><div className={styles.notch}/><div className={styles.storebar}><b>Корзина</b><span>×</span></div><div className={styles.orderItem}><img src={setPhoto} alt="Товар в корзине"/><span><b>Двойка Cloud navy</b><small>Размер M · 52 900 ₸</small></span></div><div className={styles.choice}><b>Как получить</b><p>◉ Доставка с примеркой</p><p>○ Самовывоз и бронь</p></div><div className={styles.choice}><b>Оплата</b><p>◉ При получении</p><small>Kaspi QR при выдаче</small></div><button className={styles.checkout}>Подтвердить · 52 900 ₸ <i>→</i></button></div>
        <div className={styles.copy}><h3>Условия без сюрпризов</h3><p>Покупатель выбирает доставку или бронь. Оплата — только реальным способом магазина.</p></div>
      </article>
      <article className={styles.block}>
        <div className={styles.blockTop}><b>03</b><span>Заказ сразу в приложении</span></div>
        <div className={styles.dashboard}><div className={styles.side}><strong>D</strong><span>Главная</span><span className={styles.active}>Заказы</span><span>Товары</span><span>Клиенты</span></div><div className={styles.content}><p>Сегодня · 12 августа</p><h2>Новый заказ <em>●</em></h2><div className={styles.orderRow}><img src={productPhoto} alt="Заказ товара"/><span><b>#DK-2048 · Куртка Soft utility</b><small>Размер M · доставка с примеркой</small></span><strong>48 900 ₸</strong></div><div className={styles.status}><span>Новый</span><i>→</i><span>Подтверждён</span><i>→</i><span>Выдан</span></div></div></div>
        <div className={styles.copy}><h3>Владелец видит заказ сразу</h3><p>Заказ появляется в CRM: можно подтвердить, собрать, выдать или перевести в доставку.</p></div>
      </article>
    </section>
    <section className={styles.bottom}><div><p>НЕ «САЙТ РАДИ САЙТА»</p><h2>Покупатель выбирает.<br />Владелец управляет.</h2></div><div>Instagram / ссылка<br /><b>→ Каталог → Заказ → CRM</b></div></section>
  </main>;
}
