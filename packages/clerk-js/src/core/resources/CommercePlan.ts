import type { CommercePlanJSON, CommercePlanResource } from '@clerk/types';

import { BaseResource, CommerceFeature } from './internal';

export class CommercePlan extends BaseResource implements CommercePlanResource {
  id!: string;
  name!: string;
  amount!: number;
  amountFormatted!: string;
  currencySymbol!: string;
  currency!: string;
  description!: string;
  isRecurring!: boolean;
  hasBaseFee!: boolean;
  payerType!: string[];
  slug!: string;
  avatarUrl!: string;
  features!: CommerceFeature[];

  constructor(data: CommercePlanJSON) {
    super();
    this.fromJSON(data);
  }

  protected fromJSON(data: CommercePlanJSON | null): this {
    if (!data) {
      return this;
    }

    this.id = data.id;
    this.name = data.name;
    this.amount = data.amount;
    this.amountFormatted = data.amount_formatted;
    this.currencySymbol = data.currency_symbol;
    this.currency = data.currency;
    this.description = data.description;
    this.isRecurring = data.is_recurring;
    this.hasBaseFee = data.has_base_fee;
    this.payerType = data.payer_type;
    this.slug = data.slug;
    this.avatarUrl = data.avatar_url;
    this.features = data.features.map(feature => new CommerceFeature(feature));

    return this;
  }
}
