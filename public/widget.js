(function() {
  // Prevent duplicate initialization
  const scriptTag = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      if (scripts[i].src && scripts[i].src.indexOf('widget.js') !== -1) {
        return scripts[i];
      }
    }
    return null;
  })();

  if (!scriptTag) {
    console.error('[FlyRank Widget] Unable to locate script tag');
    return;
  }

  let scriptUrl;
  try {
    scriptUrl = new URL(scriptTag.src, window.location.href);
  } catch (e) {
    console.error('[FlyRank Widget] Invalid script source URL', e);
    return;
  }

  const widgetId = scriptUrl.searchParams.get('id') || window.__FLYRANK_WIDGET_ID__;
  const widgetVersion = scriptUrl.searchParams.get('v');
  const apiBase = scriptUrl.origin;

  if (!widgetId) {
    console.error('[FlyRank Widget] Missing required "?id=" parameter');
    return;
  }

  // Create isolated container
  const containerId = 'flyrank-widget-container-' + widgetId;
  if (document.getElementById(containerId)) {
    return; // Already rendered
  }

  const container = document.createElement('div');
  container.id = containerId;
  container.className = 'flyrank-widget-root';

  // Inject widget CSS styles
  const style = document.createElement('style');
  style.textContent = `
    .flyrank-widget-root {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 440px;
      margin: 0 auto;
      padding: 32px;
      background: #ffffff;
      border: 1px solid #f1f5f9;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.05);
      color: #0f172a;
      box-sizing: border-box;
      transition: box-shadow 0.3s ease;
    }
    .flyrank-widget-root:hover {
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.05);
    }
    .flyrank-widget-root * {
      box-sizing: border-box;
    }
    .flyrank-widget-title {
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin: 0 0 8px 0;
      color: #0f172a;
    }
    .flyrank-widget-desc {
      font-size: 0.9375rem;
      color: #64748b;
      margin: 0 0 24px 0;
      line-height: 1.6;
    }
    .flyrank-form-group {
      margin-bottom: 20px;
    }
    .flyrank-form-label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: #334155;
      text-transform: capitalize;
    }
    .flyrank-form-input, .flyrank-form-textarea {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      font-size: 0.9375rem;
      color: #0f172a;
      background-color: #f8fafc;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .flyrank-form-input:hover, .flyrank-form-textarea:hover {
      border-color: #94a3b8;
    }
    .flyrank-form-input:focus, .flyrank-form-textarea:focus {
      outline: none;
      background-color: #ffffff;
      border-color: #3b82f6;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
    }
    .flyrank-form-textarea {
      min-height: 100px;
      resize: vertical;
    }
    .flyrank-submit-btn {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 8px;
      padding: 14px 24px;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2), 0 2px 4px -2px rgba(37, 99, 235, 0.2);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .flyrank-submit-btn:hover:not(:disabled) {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.3), 0 4px 6px -4px rgba(37, 99, 235, 0.3);
      transform: translateY(-1px);
    }
    .flyrank-submit-btn:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: none;
    }
    .flyrank-submit-btn:disabled {
      background: #94a3b8;
      box-shadow: none;
      cursor: not-allowed;
      opacity: 0.8;
    }
    .flyrank-spinner {
      width: 18px;
      height: 18px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: flyrank-spin 1s ease-in-out infinite;
    }
    @keyframes flyrank-spin {
      to { transform: rotate(360deg); }
    }
    .flyrank-message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 500;
      display: none;
      animation: flyrank-fade-in 0.3s ease-out forwards;
    }
    @keyframes flyrank-fade-in {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .flyrank-message.success {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .flyrank-message.error {
      display: block;
      background-color: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .flyrank-message.success::before {
      content: "✓";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: #10b981;
      color: white;
      border-radius: 50%;
      font-size: 12px;
      font-weight: bold;
    }
  `;
  document.head.appendChild(style);

  // Fetch widget configuration with version cache busting if present
  const configEndpoint = apiBase + '/api/submissions/config/' + widgetId + (widgetVersion ? '?v=' + encodeURIComponent(widgetVersion) : '');
  fetch(configEndpoint)
    .then(function(res) {
      if (!res.ok) {
        throw new Error('Failed to load widget config (' + res.status + ')');
      }
      return res.json();
    })
    .then(function(config) {
      renderWidget(config);
    })
    .catch(function(err) {
      console.error('[FlyRank Widget] Load error:', err);
    });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderWidget(config) {
    let fieldsHtml = '';
    const fields = Array.isArray(config.fields) ? config.fields : [];

    fields.forEach(function(field) {
      const safeName = escapeHtml(field.name);
      const safeType = escapeHtml(field.type || 'text');
      const fieldId = 'flyrank-f-' + safeName + '-' + escapeHtml(widgetId);
      const isReq = field.required ? 'required' : '';
      const reqMark = field.required ? ' <span style="color:#ef4444">*</span>' : '';

      if (field.type === 'textarea') {
        fieldsHtml += `
          <div class="flyrank-form-group">
            <label class="flyrank-form-label" for="${fieldId}">${safeName}${reqMark}</label>
            <textarea class="flyrank-form-textarea" id="${fieldId}" name="${safeName}" ${isReq}></textarea>
          </div>
        `;
      } else {
        fieldsHtml += `
          <div class="flyrank-form-group">
            <label class="flyrank-form-label" for="${fieldId}">${safeName}${reqMark}</label>
            <input class="flyrank-form-input" type="${safeType}" id="${fieldId}" name="${safeName}" ${isReq} />
          </div>
        `;
      }
    });

    const safeTitle = escapeHtml(config.title || 'Get In Touch');
    const safeDesc = config.description ? `<p class="flyrank-widget-desc">${escapeHtml(config.description)}</p>` : '';
    const safeBtn = escapeHtml(config.button_text || 'Submit');

    container.innerHTML = `
      <h3 class="flyrank-widget-title">${safeTitle}</h3>
      ${safeDesc}
      <form class="flyrank-form" id="flyrank-form-${escapeHtml(widgetId)}">
        <!-- Honeypot trap field (hidden from real users, bots fill this) -->
        <input type="text" name="honeypot" style="display:none !important; position:absolute; left:-9999px;" tabindex="-1" autocomplete="off" />
        ${fieldsHtml}
        <button type="submit" class="flyrank-submit-btn" id="flyrank-btn-${escapeHtml(widgetId)}">
          ${safeBtn}
        </button>
        <div class="flyrank-message" id="flyrank-msg-${escapeHtml(widgetId)}"></div>
      </form>
    `;

    // Insert container into DOM right after script tag or into body
    if (scriptTag.parentNode) {
      scriptTag.parentNode.insertBefore(container, scriptTag.nextSibling);
    } else {
      document.body.appendChild(container);
    }

    const form = document.getElementById('flyrank-form-' + widgetId);
    const submitBtn = document.getElementById('flyrank-btn-' + widgetId);
    const msgBox = document.getElementById('flyrank-msg-' + widgetId);

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      msgBox.className = 'flyrank-message';
      msgBox.textContent = '';
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="flyrank-spinner"></span> Submitting...';

      const formData = new FormData(form);
      const submissionData = {};
      let honeypotVal = '';

      formData.forEach(function(val, key) {
        if (key === 'honeypot') {
          honeypotVal = val;
        } else {
          submissionData[key] = val;
        }
      });

      const payload = {
        widget_id: widgetId,
        data: submissionData,
        honeypot: honeypotVal
      };

      fetch(apiBase + '/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
        .then(function(res) {
          return res.json().then(function(data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function(resObj) {
          submitBtn.disabled = false;
          submitBtn.textContent = config.button_text || 'Submit';

          if (resObj.ok) {
            msgBox.className = 'flyrank-message success';
            msgBox.textContent = 'Thank you! Your submission has been received.';
            form.reset();
          } else {
            msgBox.className = 'flyrank-message error';
            msgBox.textContent = (resObj.data && resObj.data.error) ? resObj.data.error : 'Submission failed. Please try again.';
          }
        })
        .catch(function(err) {
          submitBtn.disabled = false;
          submitBtn.textContent = config.button_text || 'Submit';
          msgBox.className = 'flyrank-message error';
          msgBox.textContent = 'Network error. Please try again later.';
          console.error('[FlyRank Widget] Submission error:', err);
        });
    });
  }
})();
