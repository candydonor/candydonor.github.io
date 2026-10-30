(() => {
  if (window.__bankCorsPocLoaded) return;
  window.__bankCorsPocLoaded = true;

  const style = document.createElement("style");
  style.textContent = `
    #bank-cors-poc {
      position: fixed; z-index: 2147483647; top: 16px; right: 16px;
      width: min(520px, calc(100vw - 32px)); max-height: 85vh; overflow: auto;
      padding: 18px; border: 1px solid #dce1e8; border-radius: 16px;
      background: #fff; color: #17202a; box-shadow: 0 12px 40px #0003;
      font: 14px/1.45 system-ui, sans-serif;
    }
    #bank-cors-poc * { box-sizing: border-box; }
    #bank-cors-poc h2 { margin: 0 0 8px; font-size: 18px; }
    #bank-cors-poc p { margin: 0 0 12px; color: #5c6672; }
    #bank-cors-poc button {
      padding: 9px 13px; border: 0; border-radius: 9px;
      background: #315efb; color: white; font-weight: 600; cursor: pointer;
    }
    #bank-cors-poc button:disabled { opacity: .6; cursor: wait; }
    #bank-cors-poc .poc-status { margin: 12px 0; color: #46515c; }
    #bank-cors-poc .poc-item {
      padding: 12px 0; border-top: 1px solid #edf0f3;
      display: grid; grid-template-columns: 1fr auto; gap: 4px 12px;
    }
    #bank-cors-poc .poc-title { font-weight: 650; }
    #bank-cors-poc .poc-amount { font-weight: 650; white-space: nowrap; }
    #bank-cors-poc .poc-meta { color: #687481; font-size: 12px; }
    #bank-cors-poc .poc-close {
      float: right; background: #eef1f5; color: #27313b;
      padding: 5px 9px;
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.id = "bank-cors-poc";

  const close = document.createElement("button");
  close.className = "poc-close";
  close.textContent = "Закрыть";
  close.addEventListener("click", () => panel.remove());

  const heading = document.createElement("h2");
  heading.textContent = "Демонстрация CORS";

  const note = document.createElement("p");
  note.textContent =
    "Запрос выполняется только после нажатия. Ответ отображается локально и не отправляется.";

  const run = document.createElement("button");
  run.textContent = "Показать операции тестового аккаунта";

  const status = document.createElement("div");
  status.className = "poc-status";
  status.setAttribute("role", "status");

  const list = document.createElement("div");

  panel.append(close, heading, note, run, status, list);
  document.body.appendChild(panel);

  const addText = (parent, className, value) => {
    const el = document.createElement("div");
    el.className = className;
    el.textContent = value == null ? "" : String(value);
    parent.appendChild(el);
    return el;
  };

  run.addEventListener("click", async () => {
    run.disabled = true;
    list.replaceChildren();
    status.textContent = "Запрашиваю данные…";

    try {
      const sessionResponse = await fetch(
        "https://bank.yandex.ru/auth/api/session/start",
        {
          method: "POST",
          mode: "cors",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        }
      );

      if (!sessionResponse.ok) {
        throw new Error(`session/start вернул HTTP ${sessionResponse.status}`);
      }

      const response = await fetch(
        "https://bank.yandex.ru/transactions/api/graphql?operationId=9bf3cf40fd987f779649b53757e1ea3b6d24526cbcc16e193bb78ac398ca4e02",
        {
          method: "POST",
          mode: "cors",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Yabank-Time-Zone": "Asia/Yerevan",
          },
          body: JSON.stringify({
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
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`transactions query вернул HTTP ${response.status}`);
      }

      const payload = await response.json();
      const items = payload?.data?.getTransactionsFeedPfm?.items;

      if (!Array.isArray(items)) {
        throw new Error("В ответе не найден массив items");
      }

      status.textContent = `Операций получено: ${items.length}`;

      for (const item of items) {
        const row = document.createElement("article");
        row.className = "poc-item";

        const compound = item.title?.compound;
        const title =
          item.title?.plain ||
          [compound?.firstPart, compound?.secondPart].filter(Boolean).join(" · ") ||
          "Операция";

        const money = item.amount?.money;
        const amount = money?.amount ?? item.amount?.plus ?? "";
        const currency = money?.currency ?? (item.amount?.plus != null ? "PLUS" : "");
        const sign = item.direction === "CREDIT" ? "+" : "−";

        addText(row, "poc-title", title);
        addText(row, "poc-amount", amount ? `${sign}${amount} ${currency}` : "");

        const date = item.date ? new Date(item.date).toLocaleString("ru-RU") : "";
        addText(
          row,
          "poc-meta",
          [date, item.description, item.rightSubTitle, item.statusCode]
            .filter(Boolean)
            .join(" · ")
        );

        list.appendChild(row);
      }
    } catch (error) {
      status.textContent = `Ошибка: ${error.message}`;
    } finally {
      run.disabled = false;
    }
  });
})();
