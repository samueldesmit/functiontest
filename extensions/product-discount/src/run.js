// @ts-check
import { DiscountApplicationStrategy } from "../generated/api";

// Use JSDoc annotations for type safety
/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 * @typedef {import("../generated/api").Target} Target
 * @typedef {import("../generated/api").ProductVariant} ProductVariant
 */

/**
 * @type {FunctionRunResult}
 */
const EMPTY_DISCOUNT = {
  discountApplicationStrategy: DiscountApplicationStrategy.First,
  discounts: [],
};

// The configured entrypoint for the 'purchase.product-discount.run' extension target
/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Targets array is going to be used to store the cart lines that will be targeted for the discount
  const targets = []

  // Define the bundles, if no child is needed fill in the children object empty zo id:" " & max_per_parent: 0
  const bundles = [    
    {
      parent_product: {
       id: 'gid://shopify/Product/7046182633562', 
        quantity_needed: 1,
        children: [
          {
           id: 'gid://shopify/Product/7046188335194',
            max_per_parent: 2
          }
        ]
      },  
    },
    {
      parent_product: {
        id: 'gid://shopify/Product/7046182142042', 
        quantity_needed: 1,
        children: [
          {
           id: 'gid://shopify/Product/7046188335194',
            max_per_parent: 2
          }
        ]
      },
    },
    {
      parent_product: {
        id: 'gid://shopify/Product/7046180503642', 
        quantity_needed: 1,
        children: [
          {
            id: '',
            max_per_parent: 0
          }
        ]
      },  
    }
  ];

// Get all the products in the cart
  const cartVariants = new Set(input.cart.lines.map(line => line.merchandise.product.id));

  // Get the currency fluctuation data en set the threshold en get currency code from checkout
  const currencyFluctuation = input.shop.metafield?.value;
  const currencyData = JSON.parse(currencyFluctuation);
  const rates = currencyData.rates;
  const currentCurrencyCode = input.cart.cost.totalAmount.currencyCode;
  const currentRate = rates[currentCurrencyCode] || 1;
  const threshold = Math.round(950 * currentRate);
  // const filteredRates = Object.entries(rates).filter(([currency, rate]) => rate > 1);
  const configurationDicsountPercentage = JSON.parse(
    input?.discountNode?.metafield?.value ?? "{}"
  );

  
// Threshold for discount
if(input.cart.cost.totalAmount.amount > threshold) {
console.error("Cart total is above threshold the threshold was" + threshold + "in " + currentCurrencyCode); ;
console.error(configurationDicsountPercentage)
console.error(configurationDicsountPercentage.percentage)
console.error(configurationDicsountPercentage.id)

  bundles.forEach(bundle => {
    const quantityObject = {}
    const childrenInCart = cartVariants.has(bundle.parent_product.id) && bundle.parent_product.children.every(item => cartVariants.has(item.id));
    const parentInCart = cartVariants.has(bundle.parent_product.id)

    // check for products in cart
    if (parentInCart || childrenInCart) {
      input.cart.lines.forEach((line, key) => {
        if (bundle.parent_product.id === line.merchandise.product.id) {
          quantityObject.parent = line.quantity
          targets.push({
            cartLine: {
              id: line.id
            }
          });
        }
      });

      // check for children in cart
      input.cart.lines.forEach((line, key) => { 
      if (bundle.parent_product.children.every(item => item.id === line.merchandise.product.id)) {
        const childQuantity = bundle.parent_product.children.filter(item => item.id === line.merchandise.product.id)[0].max_per_parent
        const parentQuantity = quantityObject.parent
        const totalQuantity = childQuantity * parentQuantity
          targets.push({
            cartLine: {
              id: line.id,
              quantity: totalQuantity
            }
          });
        }
      });
    }
  })
}

// If no targets are found, return an empty discount and log in the console (partner dashboard)
if (!targets.length) {
    console.error("No bundles qualify for a discount.");
    return EMPTY_DISCOUNT;
  }
  return {
    discounts: [
      {
        targets,
        message: `bundle-threshold-dynamic discount`,
        value: {
          percentage: {
            value:`${configurationDicsountPercentage.percentage}`, 
          }
        }
      }
    ],
    discountApplicationStrategy: DiscountApplicationStrategy.All
  };
}