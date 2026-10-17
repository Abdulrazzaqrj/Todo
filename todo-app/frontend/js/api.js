
 // All communication with the Spring Boot REST API lives here.

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Backend URL: saved Settings URL, otherwise config.js
const ApiConfig = {
  get() {
    try {
      return (
        (localStorage.getItem("apiUrl") || "").trim() || API_URL
      ).replace(/\/+$/, "");
    } catch (e) {
      return API_URL.replace(/\/+$/, "");
    }
  },

  set(url) {
    try {
      localStorage.setItem("apiUrl", url.trim().replace(/\/+$/, ""));
    } catch (e) {
      console.error("Could not save API URL:", e);
    }
  },

  reset() {
    try {
      localStorage.removeItem("apiUrl");
    } catch (e) {
      console.error("Could not reset API URL:", e);
    }
  },
};

const TaskApi = (() => {
  async function request(path = "", method = "GET", body) {
    const url = ApiConfig.get() + path;
    let response;

    try {
      console.log("API request:", method, url);

      response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      console.error("Network/API connection error:", error);

      throw new ApiError(
        "Cannot reach the backend. Check the API URL, backend status, and CORS settings.",
        0
      );
    }

    if (response.status === 204) {
      return null;
    }

    const rawResponse = await response.text();
    let data = null;

    try {
      data = rawResponse ? JSON.parse(rawResponse) : null;
    } catch {
      // The server response was not JSON.
    }

    if (!response.ok) {
      console.error("Backend request failed:", {
        url,
        method,
        status: response.status,
        response: rawResponse,
      });

      let message =
        data?.message ||
        data?.error ||
        data?.detail;

      if (!message) {
        if (response.status === 500) {
          message =
            "Internal server error. Check the Render backend logs for the exact cause.";
        } else {
          message = `Request failed (${response.status})`;
        }
      }

      throw new ApiError(message, response.status);
    }

    return data;
  }

  return {
    list(params = {}) {
      const query = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.set(key, value);
        }
      });

      const qs = query.toString();
      return request(qs ? "?" + qs : "");
    },

    get(id) {
      return request("/" + encodeURIComponent(id));
    },

    create(task) {
      return request("", "POST", task);
    },

    update(id, task) {
      return request("/" + encodeURIComponent(id), "PUT", task);
    },

    setStatus(id, status) {
      return request(
        "/" + encodeURIComponent(id) + "/status",
        "PATCH",
        { status }
      );
    },

    remove(id) {
      return request("/" + encodeURIComponent(id), "DELETE");
    },
  };
})();
