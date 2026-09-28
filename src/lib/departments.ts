import type { Department } from './api';

export const HOLO: Record<Department | 'newcomer', [string, string, string]> = {
  design: ['#FF7AB8', '#A86BFF', '#6FD3FF'],
  engineering: ['#3DDBB0', '#6FD3FF', '#5AAFE3'],
  sales: ['#C8F53C', '#FF9F43', '#FF7AB8'],
  people: ['#FF8A7A', '#C8F53C', '#FF7AB8'],
  finance: ['#2FD18A', '#B8F35A', '#3DDBB0'],
  product: ['#A86BFF', '#5AAFE3', '#BDF4E0'],
  ops: ['#FFB36B', '#FCD9EF', '#5AAFE3'],
  newcomer: ['#FF7AB8', '#C8F53C', '#BDF4E0'],
};

export const DEPT_LABEL: Record<Department, string> = {
  design: 'Design',
  engineering: 'Engineering',
  sales: 'Sales',
  people: 'People',
  finance: 'Finance',
  product: 'Product',
  ops: 'Ops',
};

/** Org chart order and full team names. */
export const DEPT_ORDER: Department[] = ['people', 'product', 'design', 'engineering', 'sales', 'finance', 'ops'];

export const DEPT_LONG: Record<Department, string> = {
  people: 'People & HR',
  product: 'Product',
  design: 'Design',
  engineering: 'Engineering',
  sales: 'Sales',
  finance: 'Finance',
  ops: 'Operations & Office',
};
