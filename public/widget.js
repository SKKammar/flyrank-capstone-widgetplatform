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
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      max-width: 440px;
      margin: 20px auto;
      padding: 24px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      color: #1e293b;
      box-sizing: border-box;
    }
    .flyrank-widget-root * {
      box-sizing: border-box;
    }
    .flyrank-widget-title {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #0f172a;
    }
    .flyrank-widget-desc {
      font-size: 0.875rem;
      color: #64748b;
      margin: 0 0 20px 0;
      line-height: 1.5;
    }
    .flyrank-form-group {
      margin-bottom: 16px;
    }
    .flyrank-form-label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 600;
      margin-bottom: 6px;
      color: #334155;
      text-transform: capitalize;
    }
    .flyrank-form-input, .flyrank-form-textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 0.9375rem;
      color: #0f172a;
      background-color: #f8fafc;
      transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
    }
    .flyrank-form-input:focus, .flyrank-form-textarea:focus {
      outline: none;
      background-color: #ffffff;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    }
    .flyrank-form-textarea {
      min-height: 80px;
      resize: vertical;
    }
    .flyrank-submit-btn {
      width: 100%;
      padding: 12px 18px;
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-size: 0.9375rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .flyrank-submit-btn:hover {
      background: #1d4ed8;
    }
    .flyrank-submit-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .flyrank-message {
      margin-top: 14px;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.875rem;
      display: none;
    }
    .flyrank-message.success {
      display: block;
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
  `;
  document.head.appendChild(style);

  // Fetch widget configuration
  fetch(apiBase + '/api/submissions/config/' + widgetId)
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

  function renderWidget(config) {
    let fieldsHtml = '';
    const fields = Array.isArray(config.fields) ? config.fields : [];

    fields.forEach(function(field) {
      const fieldId = 'flyrank-f-' + field.name + '-' + widgetId;
      const isReq = field.required ? 'required' : '';
      const reqMark = field.required ? ' <span style="color:#ef4444">*</span>' : '';

      if (field.type === 'textarea') {
        fieldsHtml += `
          <div class="flyrank-form-group">
            <label class="flyrank-form-label" for="${fieldId}">${field.name}${reqMark}</label>
            <textarea class="flyrank-form-textarea" id="${fieldId}" name="${field.name}" ${isReq}></textarea>
          </div>
        `;
      } else {
        fieldsHtml += `
          <div class="flyrank-form-group">
            <label class="flyrank-form-label" for="${fieldId}">${field.name}${reqMark}</label>
            <input class="flyrank-form-input" type="${field.type || 'text'}" id="${fieldId}" name="${field.name}" ${isReq} />
          </div>
        `;
      }
    });

    container.innerHTML = `
      <h3 class="flyrank-widget-title">${config.title || 'Get In Touch'}</h3>
      ${config.description ? `<p class="flyrank-widget-desc">${config.description}</p>` : ''}
      <form class="flyrank-form" id="flyrank-form-${widgetId}">
        <!-- Honeypot trap field (hidden from real users, bots fill this) -->
        <input type="text" name="honeypot" style="display:none !important; position:absolute; left:-9999px;" tabindex="-1" autocomplete="off" />
        ${fieldsHtml}
        <button type="submit" class="flyrank-submit-btn" id="flyrank-btn-${widgetId}">
          ${config.button_text || 'Submit'}
        </button>
        <div class="flyrank-message" id="flyrank-msg-${widgetId}"></div>
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
      submitBtn.textContent = 'Submitting...';

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
