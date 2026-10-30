(() => {
  if (window.__bankCorsPocLoaded) return;
  window.__bankCorsPocLoaded = true;

  const style = document.createElement("style");
  style.textContent = `
    #bank-cors-poc {
      position: fixed; inset: 0; z-index: 2147483647;
      display: grid; place-items: center; padding: 20px;
      background: #10182888; font: 14px/1.45 system-ui, sans-serif;
      color: #17202a;
    }
    #bank-cors-poc, #bank-cors-poc * { box-sizing: border-box; }
    #bank-cors-poc .panel {
      width: min(620px, 100%); max-height: 85vh; overflow: auto;
      padding: 22px; border: 1px solid #dce1e8; border-radius: 18px;
      background: #fff; box-shadow: 0 20px 60px #0004;
    }
    #bank-cors-poc h2 { margin: 0 0 6px; font-size: 20px; }
    #bank-cors-poc p { margin: 0 0 16px; color: #5c6672; }
    #bank-cors-poc .actions { display: flex; flex-wrap: wrap; gap: 9px; }
    #bank-cors-poc button {
      padding: 10px 14px; border: 0; border-radius: 9px;
      background: #315efb; color: white; font-weight: 600; cursor: pointer;
    }
    #bank-cors-poc button.secondary { background: #edf1f7; color: #27313b; }
    #bank-cors-poc button:disabled { opacity: .6; cursor: wait; }
    #bank-cors-poc .status { min-height: 21px; margin: 14px 0 6px; color: #46515c; }
    #bank-cors-poc .item, #bank-cors-poc .balance {
      padding: 12px 0; border-top: 1px solid #edf0f3;
    }
    #bank-cors-poc .item {
      display: grid; grid-template-columns: 1fr auto; gap: 4px 12px;
    }
    #bank-cors-poc .title, #bank-cors-poc .amount { font-weight: 650; }
    #bank-cors-poc .amount { white-space: nowrap; }
    #bank-cors-poc .meta { grid-column: 1 / -1; color: #687481; font-size: 12px; }
    #bank-cors-poc .balance { display: flex; justify-content: space-between; gap: 16px; }
    #bank-cors-poc .close { float: right; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "bank-cors-poc";

  const panel = document.createElement("div");
  panel.className = "panel";

  const closeButton = document.createElement("button");
  closeButton.className = "secondary close";
  closeButton.textContent = "Закрыть";
  closeButton.addEventListener("click", () => {
    overlay.remove();
    style.remove();
    delete window.__bankCorsPocLoaded;
  });

  const heading = document.createElement("h2");
  heading.textContent = "Демонстрация CORS";

  const note = document.createElement("p");
  note.textContent =
    "Запросы запускаются вручную. Ответ отображается на этой странице и не отправляется.";

  const actions = document.createElement("div");
  actions.className = "actions";

  const transactionsButton = document.createElement("button");
  transactionsButton.textContent = "Показать операции";

  const balanceButton = document.createElement("button");
  balanceButton.className = "secondary";
  balanceButton.textContent = "Получить баланс";

  const status = document.createElement("div");
  status.className = "status";
  status.setAttribute("role", "status");

  const results = document.createElement("div");

  actions.append(transactionsButton, balanceButton);
  panel.append(closeButton, heading, note, actions, status, results);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const addText = (parent, className, value) => {
    const element = document.createElement("div");
    element.className = className;
    element.textContent = value == null ? "" : String(value);
    parent.appendChild(element);
    return element;
  };

  let sessionReady = false;

  async function ensureSession() {
    if (sessionReady) return;

    const response = await fetch(
      "https://bank.yandex.ru/auth/api/session/start",
      {
        method: "POST",
        mode: "cors",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }
    );

    if (!response.ok) {
      throw new Error(`session/start: HTTP ${response.status}`);
    }

    sessionReady = true;
  }

  async function postGraphql(url, body, extraHeaders = {}) {
    await ensureSession();

    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    if (payload.errors?.length) {
      throw new Error(payload.errors.map((error) => error.message).join("; "));
    }
    return payload.data;
  }

  function setBusy(button, busy, message) {
    transactionsButton.disabled = busy;
    balanceButton.disabled = busy;
    button.disabled = busy;
    status.textContent = message;
  }

  transactionsButton.addEventListener("click", async () => {
    results.replaceChildren();
    setBusy(transactionsButton, true, "Загружаю операции…");

    try {
      const data = await postGraphql(
        "https://bank.yandex.ru/transactions/api/graphql?operationId=9bf3cf40fd987f779649b53757e1ea3b6d24526cbcc16e193bb78ac398ca4e02",
        {
          operationName: "TransactionsFeedPfm",
          variables: {
            input: {
              categories: [],
              baseFilters: { filters: [] },
            },
          },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash:
                "9bf3cf40fd987f779649b53757e1ea3b6d24526cbcc16e193bb78ac398ca4e02",
            },
          },
        },
        { "X-Yabank-Time-Zone": "Asia/Yerevan" }
      );

      const items = data?.getTransactionsFeedPfm?.items;
      if (!Array.isArray(items)) throw new Error("В ответе нет массива items");

      status.textContent = `Операций получено: ${items.length}`;

      for (const item of items) {
        const row = document.createElement("article");
        row.className = "item";

        const compound = item.title?.compound;
        const title =
          item.title?.plain ||
          [compound?.firstPart, compound?.secondPart].filter(Boolean).join(" · ") ||
          "Операция";

        const money = item.amount?.money;
        const amount = money?.amount ?? item.amount?.plus ?? "";
        const currency = money?.currency ?? (item.amount?.plus != null ? "PLUS" : "");
        const sign = item.direction === "CREDIT" ? "+" : "−";

        addText(row, "title", title);
        addText(row, "amount", amount ? `${sign}${amount} ${currency}` : "");

        const date = item.date
          ? new Date(item.date).toLocaleString("ru-RU")
          : "";

        addText(
          row,
          "meta",
          [date, item.description, item.rightSubTitle, item.statusCode]
            .filter(Boolean)
            .join(" · ")
        );

        results.appendChild(row);
      }
    } catch (error) {
      status.textContent = `Ошибка: ${error.message}`;
    } finally {
      transactionsButton.disabled = false;
      balanceButton.disabled = false;
    }
  });

  balanceButton.addEventListener("click", async () => {
    results.replaceChildren();
    setBusy(balanceButton, true, "Загружаю баланс…");

    try {
      const data = await postGraphql(
        "https://bank.yandex.ru/web-pay-card-bff/api/graphql?operationId=488d5a4dfa14b5abfb989740557c515eb92268d8dd21d1bf5458fbc8f3a59202",
        {
          operationName: "PayCardBalancesPolling",
          variables: { includeUltra: true },
          extensions: {
            persistedQuery: {
              version: 1,
              sha256Hash:
                "488d5a4dfa14b5abfb989740557c515eb92268d8dd21d1bf5458fbc8f3a59202",
            },
          },
        }
      );

      const formatMoney = (value) => {
        if (!value) return "—";
        const amount = value.amount ?? "—";
        const currency = value.currency ?? "";
        return `${amount} ${currency}`.trim();
      };

      const cardBalance = data?.debitCard?.balance;
      const boostBalance = data?.boost?.balance;

      if (!cardBalance && !boostBalance) {
        throw new Error("В ответе не найдены данные баланса");
      }

      status.textContent = "Баланс получен";

      if (cardBalance) {
        const row = document.createElement("div");
        row.className = "balance";
        addText(row, "", "Дебетовая карта");
        addText(row, "amount", formatMoney(cardBalance));
        results.appendChild(row);
      }

      if (boostBalance) {
        for (const [label, value] of [
          ["Boost — всего", boostBalance.total],
          ["Доступно", boostBalance.available],
          ["Использовано", boostBalance.used],
        ]) {
          if (!value) continue;
          const row = document.createElement("div");
          row.className = "balance";
          addText(row, "", label);
          addText(row, "amount", formatMoney(value));
          results.appendChild(row);
        }
      }
    } catch (error) {
      status.textContent = `Ошибка: ${error.message}`;
    } finally {
      transactionsButton.disabled = false;
      balanceButton.disabled = false;
    }
  });
})();
