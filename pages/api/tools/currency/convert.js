import axios from "axios";
class XeConverter {
  constructor() {
    this.cfg = {
      base: "https://www.xe.com/api",
      endpoints: {
        rates: "/protected/live-currency-pairs-rates/",
        midmarket: "/protected/midmarket-converter/",
        charts: "/protected/charting-rates/",
        country: "/get-country-from-currency/",
        comparison: "/v1/comparison/section/"
      },
      defaults: {
        amount: 1,
        from: "IDR",
        to: "USD",
        crypto: true
      }
    };
    const auth = Buffer.from("lodestar:pugsnax").toString("base64");
    this.headers = {
      accept: "*/*",
      authorization: `Basic ${auth}`,
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
      referer: "https://www.xe.com/"
    };
    this.cache = {
      currencies: null,
      countries: {},
      charts: {},
      comparisons: {}
    };
  }
  valAmt(amount) {
    const num = parseFloat(amount);
    if (isNaN(num)) {
      return {
        valid: false,
        error: "INVALID_AMOUNT",
        message: "Amount must be a valid number",
        field: "amount",
        value: amount
      };
    }
    if (num <= 0) {
      return {
        valid: false,
        error: "AMOUNT_TOO_SMALL",
        message: "Amount must be greater than 0",
        field: "amount",
        value: num
      };
    }
    return {
      valid: true,
      value: num,
      field: "amount"
    };
  }
  valCur(code) {
    const c = code.toUpperCase().trim();
    if (!c || c.length === 0) {
      return {
        valid: false,
        error: "EMPTY_CURRENCY_CODE",
        message: "Currency code cannot be empty",
        field: "currency",
        value: code
      };
    }
    if (!/^[A-Z]+$/.test(c)) {
      return {
        valid: false,
        error: "INVALID_CURRENCY_CODE",
        message: `Invalid currency code: ${code} (must contain only letters)`,
        field: "currency",
        value: code
      };
    }
    return {
      valid: true,
      value: c,
      field: "currency"
    };
  }
  async getAvail() {
    if (this.cache.currencies) return this.cache.currencies;
    try {
      const {
        data
      } = await axios.get(`${this.cfg.base}${this.cfg.endpoints.midmarket}`, {
        headers: this.headers
      });
      if (data?.rates) {
        this.cache.currencies = Object.keys(data.rates);
        return this.cache.currencies;
      }
      throw new Error("Failed to fetch available currencies");
    } catch (err) {
      throw new Error(`Currency fetch failed: ${err.message}`);
    }
  }
  async valAvail(code) {
    const avail = await this.getAvail();
    if (!avail.includes(code)) {
      throw new Error(`Currency not available: ${code}`);
    }
    return true;
  }
  getInfo(code, locale = "en") {
    try {
      const dn = new Intl.DisplayNames([locale], {
        type: "currency"
      });
      const name = dn.of(code);
      const sym = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol"
      }).format(0).replace(/[\d.,\s]/g, "");
      return {
        symbol: sym || code,
        name: name || code,
        name_short: name ? name.split(" ")[0] : code,
        code: code
      };
    } catch {
      return {
        symbol: code,
        name: code,
        name_short: code,
        code: code
      };
    }
  }
  async getCountry(currency) {
    if (this.cache.countries[currency]) {
      return this.cache.countries[currency];
    }
    try {
      const {
        data
      } = await axios.get(`${this.cfg.base}${this.cfg.endpoints.country}`, {
        params: {
          currency: currency
        },
        headers: this.headers
      });
      this.cache.countries[currency] = data.country || null;
      return this.cache.countries[currency];
    } catch {
      this.cache.countries[currency] = null;
      return null;
    }
  }
  async getCharts(from, to, crypto = true) {
    const key = `${from}-${to}-${crypto}`;
    if (this.cache.charts[key]) return this.cache.charts[key];
    try {
      const {
        data
      } = await axios.get(`${this.cfg.base}${this.cfg.endpoints.charts}`, {
        params: {
          fromCurrency: from,
          toCurrency: to,
          crypto: crypto
        },
        headers: this.headers
      });
      const result = {
        success: true,
        from: data.from,
        to: data.to,
        timestamp: data.timestamp,
        batch_count: data.batchList?.length || 0,
        batches: data.batchList?.map(batch => ({
          start_time: batch.startTime,
          start_date: new Date(batch.startTime).toISOString(),
          interval: batch.interval,
          interval_label: this.getIntervalLabel(batch.interval),
          rates_count: batch.rates?.length || 0,
          rates_min: Math.min(...batch.rates || [0]),
          rates_max: Math.max(...batch.rates || [0]),
          rates_avg: (batch.rates || []).reduce((a, b) => a + b, 0) / (batch.rates?.length || 1),
          rates: batch.rates
        })) || []
      };
      this.cache.charts[key] = result;
      return result;
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async getComp(from, to) {
    const key = `${from}-${to}`;
    if (this.cache.comparisons[key]) return this.cache.comparisons[key];
    try {
      const {
        data
      } = await axios.get(`${this.cfg.base}${this.cfg.endpoints.comparison}`, {
        params: {
          fromCurrency: from,
          toCurrency: to
        },
        headers: this.headers
      });
      if (!Array.isArray(data)) {
        const result = {
          success: true,
          comparisons: []
        };
        this.cache.comparisons[key] = result;
        return result;
      }
      const result = {
        success: true,
        count: data.length,
        comparisons: data.map(item => ({
          bank: item.bank,
          send_currency: item.sendCurrency,
          receive_currency: item.receiveCurrency,
          send_amount: item.sendAmount,
          receive_amount: item.receiveAmount,
          fee: item.fee,
          exchange_rate: item.exchangeRate,
          date: item.date,
          total_cost: item.sendAmount + item.fee,
          effective_rate: item.receiveAmount / (item.sendAmount + item.fee)
        }))
      };
      this.cache.comparisons[key] = result;
      return result;
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  getIntervalLabel(ms) {
    const intervals = {
      6e4: "1 minute",
      6e5: "10 minutes",
      9e5: "15 minutes",
      36e5: "1 hour",
      864e5: "1 day"
    };
    return intervals[ms] || `${ms}ms`;
  }
  fmt(value, currency) {
    const n = parseFloat(value);
    const iEn = this.getInfo(currency, "en");
    const iId = this.getInfo(currency, "id");
    return {
      idr_format: new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: currency
      }).format(n),
      us_format: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency
      }).format(n),
      with_name_en: `${iEn.symbol} ${n.toLocaleString("en-US", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
})} - ${iEn.name_short}`,
      with_full_name_en: `${iEn.symbol} ${n.toLocaleString("en-US", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
})} - ${iEn.name}`,
      with_name_id: `${iId.symbol} ${n.toLocaleString("id-ID", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
})} - ${iId.name_short}`,
      with_full_name_id: `${iId.symbol} ${n.toLocaleString("id-ID", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
})} - ${iId.name}`,
      compact: new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 2
      }).format(n),
      compact_long: new Intl.NumberFormat("en-US", {
        notation: "compact",
        compactDisplay: "long",
        maximumFractionDigits: 2
      }).format(n),
      scientific: n.toExponential(2),
      plain: n.toFixed(2),
      comma_separated: n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      dot_separated: n.toLocaleString("de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      space_separated: n.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      symbol_narrow: `${iEn.symbol}${n.toLocaleString("en-US", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
})}`,
      symbol_standard: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        currencyDisplay: "symbol"
      }).format(n),
      code_format: `${currency} ${n.toLocaleString("en-US", {
minimumFractionDigits: 2,
maximumFractionDigits: 2
})}`,
      rounded: Math.round(n),
      rounded_k: n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0),
      rounded_m: n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toFixed(0),
      accounting: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        currencySign: "accounting"
      }).format(n),
      unit_long: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
        currencyDisplay: "name"
      }).format(n)
    };
  }
  async conv({
    amount,
    from,
    to
  } = {}) {
    try {
      const amt = this.valAmt(amount || this.cfg.defaults.amount);
      const fCur = this.valCur(from || this.cfg.defaults.from);
      const tCur = this.valCur(to || this.cfg.defaults.to);
      await this.valAvail(fCur);
      await this.valAvail(tCur);
      const {
        data
      } = await axios.get(`${this.cfg.base}${this.cfg.endpoints.rates}`, {
        params: {
          currencyPairs: `${fCur}/${tCur}`,
          to: tCur
        },
        headers: this.headers
      });
      const raw = Array.isArray(data) ? data[0] : data;
      if (!raw) throw new Error("No rate data found");
      const resVal = amt * raw.rate;
      const resFmt = this.fmt(resVal, tCur);
      const amtFmt = this.fmt(amt, fCur);
      const rateFmt = this.fmt(raw.rate, tCur);
      const invFmt = this.fmt(1 / raw.rate, fCur);
      const fInfo = this.getInfo(fCur, "en");
      const tInfo = this.getInfo(tCur, "en");
      const fCountry = await this.getCountry(fCur);
      const tCountry = await this.getCountry(tCur);
      const charts = await this.getCharts(fCur, tCur, this.cfg.defaults.crypto);
      const comparison = await this.getComp(fCur, tCur);
      return {
        success: true,
        timestamp: new Date().toISOString(),
        query: {
          amount: amt,
          from: fCur,
          to: tCur,
          pair: `${fCur}/${tCur}`,
          pair_reverse: `${tCur}/${fCur}`
        },
        result: {
          value: resVal,
          formats: resFmt,
          summary: `${amtFmt.symbol_narrow} ${fInfo.name_short} = ${resFmt.symbol_narrow} ${tInfo.name_short}`,
          summary_full: `${amtFmt.with_full_name_en} = ${resFmt.with_full_name_en}`,
          summary_id: `${amtFmt.with_full_name_id} = ${resFmt.with_full_name_id}`
        },
        input: {
          value: amt,
          formats: amtFmt,
          currency: fCur,
          currency_info: {
            ...fInfo,
            country: fCountry,
            localized: this.getInfo(fCur, "id")
          }
        },
        rate: {
          value: raw.rate,
          formats: rateFmt,
          display: `1 ${fCur} = ${raw.rate.toFixed(6)} ${tCur}`,
          display_formatted: `1 ${fCur} = ${rateFmt.symbol_narrow}`,
          display_with_name: `1 ${fInfo.name_short} = ${rateFmt.with_name_en}`,
          inverse: {
            value: 1 / raw.rate,
            formats: invFmt,
            display: `1 ${tCur} = ${(1 / raw.rate).toFixed(6)} ${fCur}`,
            display_formatted: `1 ${tCur} = ${invFmt.symbol_narrow}`,
            display_with_name: `1 ${tInfo.name_short} = ${invFmt.with_name_en}`
          }
        },
        market: {
          trend: raw.trend || "neutral",
          is_up: raw.trend === "up",
          is_down: raw.trend === "down",
          is_neutral: raw.trend === "neutral" || !raw.trend,
          change: {
            value: raw.rateChange || 0,
            percent: parseFloat((raw.percentageChange || 0).toFixed(4)),
            percent_display: `${(raw.percentageChange || 0).toFixed(4)}%`,
            percent_sign: (raw.percentageChange || 0) >= 0 ? "+" : "",
            formatted: raw.rateChange ? this.fmt(Math.abs(raw.rateChange), tCur).symbol_narrow : "0",
            direction: (raw.rateChange || 0) > 0 ? "↑" : (raw.rateChange || 0) < 0 ? "↓" : "→"
          },
          spread: raw.spread || null,
          last_updated: raw.timestamp || new Date().toISOString()
        },
        charts: {
          ...charts,
          cached: this.cache.charts[`${fCur}-${tCur}-${this.cfg.defaults.crypto}`] !== undefined
        },
        comparison: {
          ...comparison,
          cached: this.cache.comparisons[`${fCur}-${tCur}`] !== undefined
        },
        metadata: {
          from_currency: {
            ...fInfo,
            country: fCountry,
            localized: this.getInfo(fCur, "id")
          },
          to_currency: {
            ...tInfo,
            country: tCountry,
            localized: this.getInfo(tCur, "id")
          },
          conversion_timestamp: new Date().toISOString(),
          api_source: "xe.com",
          total_api_calls: 5
        }
      };
    } catch (err) {
      return {
        success: false,
        error: {
          message: err.message,
          code: err.response?.status || "VALIDATION_ERROR",
          timestamp: new Date().toISOString()
        },
        query: {
          amount: amount,
          from: from,
          to: to
        }
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new XeConverter();
  try {
    const data = await api.conv(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}