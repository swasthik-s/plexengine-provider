const abc = String.fromCharCode(
  65,
  66,
  67,
  68,
  69,
  70,
  71,
  72,
  73,
  74,
  75,
  76,
  77,
  97,
  98,
  99,
  100,
  101,
  102,
  103,
  104,
  105,
  106,
  107,
  108,
  109,
  78,
  79,
  80,
  81,
  82,
  83,
  84,
  85,
  86,
  87,
  88,
  89,
  90,
  110,
  111,
  112,
  113,
  114,
  115,
  116,
  117,
  118,
  119,
  120,
  121,
  122,
);

const dechar = (x: number): string => String.fromCharCode(x);

const salt = {
  _keyStr: `${abc}0123456789+/=`,

  e(input: string): string {
    let t = '';
    let n: number;
    let r: number;
    let i: number;
    let s: number;
    let o: number;
    let u: number;
    let a: number;
    let f = 0;
    input = salt._ue(input); // eslint-disable-line no-param-reassign
    while (f < input.length) {
      n = input.charCodeAt(f++);
      r = input.charCodeAt(f++);
      i = input.charCodeAt(f++);
      s = n >> 2;
      o = ((n & 3) << 4) | (r >> 4);
      u = ((r & 15) << 2) | (i >> 6);
      a = i & 63;

      if (Number.isNaN(r)) {
        u = 64;
        a = 64;
      } else if (Number.isNaN(i)) {
        a = 64;
      }

      t += this._keyStr.charAt(s) + this._keyStr.charAt(o) + this._keyStr.charAt(u) + this._keyStr.charAt(a);
    }
    return t;
  },

  d(encoded: string): string {
    let t = '';
    let n: number;
    let r: number;
    let i: number;
    let s: number;
    let o: number;
    let u: number;
    let a: number;
    let f = 0;

    encoded = encoded.replace(/[^A-Za-z0-9+/=]/g, ''); // eslint-disable-line no-param-reassign
    while (f < encoded.length) {
      s = this._keyStr.indexOf(encoded.charAt(f++));
      o = this._keyStr.indexOf(encoded.charAt(f++));
      u = this._keyStr.indexOf(encoded.charAt(f++));
      a = this._keyStr.indexOf(encoded.charAt(f++));

      n = (s << 2) | (o >> 4);
      r = ((o & 15) << 4) | (u >> 2);
      i = ((u & 3) << 6) | a;

      t += dechar(n);
      if (u !== 64) t += dechar(r);
      if (a !== 64) t += dechar(i);
    }

    t = salt._ud(t);
    return t;
  },

  _ue(input: string): string {
    input = input.replace(/\r\n/g, '\n'); // eslint-disable-line no-param-reassign
    let t = '';
    for (let n = 0; n < input.length; n++) {
      const r = input.charCodeAt(n);
      if (r < 128) {
        t += dechar(r);
      } else if (r > 127 && r < 2048) {
        t += dechar((r >> 6) | 192);
        t += dechar((r & 63) | 128);
      } else {
        t += dechar((r >> 12) | 224);
        t += dechar(((r >> 6) & 63) | 128);
        t += dechar((r & 63) | 128);
      }
    }
    return t;
  },

  _ud(input: string): string {
    let t = '';
    let n = 0;
    let r: number;
    let c2: number;
    let c3: number;

    while (n < input.length) {
      r = input.charCodeAt(n);
      if (r < 128) {
        t += dechar(r);
        n++;
      } else if (r > 191 && r < 224) {
        c2 = input.charCodeAt(n + 1);
        t += dechar(((r & 31) << 6) | (c2 & 63));
        n += 2;
      } else {
        c2 = input.charCodeAt(n + 1);
        c3 = input.charCodeAt(n + 2);
        t += dechar(((r & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        n += 3;
      }
    }
    return t;
  },
};

const sugar = (input: string): string => {
  const parts = input.split(dechar(61));
  let result = '';
  const c1 = dechar(120);

  for (const part of parts) {
    let encoded = '';
    for (let i = 0; i < part.length; i++) {
      encoded += part[i] === c1 ? dechar(49) : dechar(48);
    }
    const chr = parseInt(encoded, 2);
    result += dechar(chr);
  }

  return result.substring(0, result.length - 1);
};

const pepper = (s: string, n: number): string => {
  s = s.replace(/\+/g, '#'); // eslint-disable-line no-param-reassign
  s = s.replace(/#/g, '+'); // eslint-disable-line no-param-reassign

  // Default value for vidsrc player
  const yValue = 'xx??x?=xx?xx?=';
  let a = Number(sugar(yValue)) * n;
  if (n < 0) a += abc.length / 2;
  const r = abc.substr(a * 2) + abc.substr(0, a * 2);
  return s.replace(/[A-Za-z]/g, (c) => r.charAt(abc.indexOf(c)));
};

export const decode = (x: string): string => {
  if (x.substr(0, 2) === '#1') {
    return salt.d(pepper(x.substr(2), -1));
  }
  if (x.substr(0, 2) === '#0') {
    return salt.d(x.substr(2));
  }
  return x;
};

export const mirza = (encodedUrl: string, v: any): string => {
  let a = encodedUrl.substring(2);
  for (let i = 4; i >= 0; i--) {
    if (v[`bk${i}`]) {
      const b1 = (str: string) =>
        btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
      a = a.replace(v.file3_separator + b1(v[`bk${i}`]), '');
    }
  }

  const b2 = (str: string) =>
    decodeURIComponent(
      atob(str)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );

  return b2(a);
};
