(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-ORDER-ID u101)
(define-constant ERR-INVALID-PRODUCT-ID u102)
(define-constant ERR-INVALID-QUANTITY u103)
(define-constant ERR-INVALID-PRICE u104)
(define-constant ERR-INVALID-STATUS u105)
(define-constant ERR-ORDER-ALREADY-EXISTS u106)
(define-constant ERR-ORDER-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-INSUFFICIENT-INVENTORY u109)
(define-constant ERR-INVALID-BUYER u110)
(define-constant ERR-INVALID-SELLER u111)
(define-constant ERR-ESCROW-NOT-SET u112)
(define-constant ERR-SUPPLY-CHAIN-NOT-SET u113)
(define-constant ERR-PRODUCT-CATALOG-NOT-SET u114)
(define-constant ERR-INVALID-DELIVERY-TIME u115)
(define-constant ERR-INVALID-PAYMENT-AMOUNT u116)
(define-constant ERR-ORDER-NOT-PENDING u117)
(define-constant ERR-ORDER-NOT-SHIPPED u118)
(define-constant ERR-ORDER-ALREADY-COMPLETED u119)
(define-constant ERR-INVALID-UPDATE u120)
(define-constant ERR-MAX-ORDERS-EXCEEDED u121)
(define-constant ERR-INVALID-LOCATION u122)
(define-constant ERR-INVALID-CURRENCY u123)

(define-data-var next-order-id uint u0)
(define-data-var max-orders uint u10000)
(define-data-var escrow-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var supply-chain-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var product-catalog-contract principal 'SP000000000000000000002Q6VF78)
(define-data-var platform-fee uint u100)

(define-map orders
  uint
  {
    product-id: uint,
    quantity: uint,
    price-per-unit: uint,
    total-amount: uint,
    buyer: principal,
    seller: principal,
    status: (string-ascii 20),
    order-timestamp: uint,
    ship-timestamp: (optional uint),
    delivery-timestamp: (optional uint),
    delivery-location: (string-utf8 100),
    currency: (string-ascii 10)
  }
)

(define-map order-updates
  uint
  {
    update-status: (string-ascii 20),
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-order (order-id uint))
  (map-get? orders order-id)
)

(define-read-only (get-order-update (order-id uint))
  (map-get? order-updates order-id)
)

(define-read-only (get-next-order-id)
  (var-get next-order-id)
)

(define-private (validate-product-id (product-id uint))
  (if (> product-id u0)
    (ok true)
    (err ERR-INVALID-PRODUCT-ID))
)

(define-private (validate-quantity (quantity uint))
  (if (> quantity u0)
    (ok true)
    (err ERR-INVALID-QUANTITY))
)

(define-private (validate-price (price uint))
  (if (> price u0)
    (ok true)
    (err ERR-INVALID-PRICE))
)

(define-private (validate-buyer (buyer principal))
  (if (not (is-eq buyer tx-sender))
    (ok true)
    (err ERR-INVALID-BUYER))
)

(define-private (validate-seller (seller principal))
  (if (not (is-eq seller tx-sender))
    (ok true)
    (err ERR-INVALID-SELLER))
)

(define-private (validate-status (status (string-ascii 20)))
  (if (or (is-eq status "pending") (is-eq status "shipped") (is-eq status "delivered") (is-eq status "cancelled"))
    (ok true)
    (err ERR-INVALID-STATUS))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
    (ok true)
    (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
    (ok true)
    (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-ascii 10)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
    (ok true)
    (err ERR-INVALID-CURRENCY))
)

(define-private (validate-payment-amount (amount uint) (expected uint))
  (if (is-eq amount expected)
    (ok true)
    (err ERR-INVALID-PAYMENT-AMOUNT))
)

(define-private (check-inventory (product-id uint) (quantity uint))
  (ok true)
)

(define-private (call-escrow-deposit (order-id uint) (amount uint))
  (ok true)
)

(define-private (call-escrow-release (order-id uint))
  (ok true)
)

(define-private (call-supply-chain-update (order-id uint) (event (string-ascii 20)))
  (ok true)
)

(define-public (set-escrow-contract (new-escrow principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set escrow-contract new-escrow)
    (ok true)
  )
)

(define-public (set-supply-chain-contract (new-supply principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set supply-chain-contract new-supply)
    (ok true)
  )
)

(define-public (set-product-catalog-contract (new-catalog principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set product-catalog-contract new-catalog)
    (ok true)
  )
)

(define-public (set-platform-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set platform-fee new-fee)
    (ok true)
  )
)

(define-public (place-order
  (product-id uint)
  (quantity uint)
  (price-per-unit uint)
  (seller principal)
  (delivery-location (string-utf8 100))
  (currency (string-ascii 10))
)
  (let (
    (order-id (var-get next-order-id))
    (total-amount (* quantity price-per-unit))
    (fee-amount (/ (* total-amount (var-get platform-fee)) u10000))
    (net-amount (- total-amount fee-amount))
  )
    (asserts! (< order-id (var-get max-orders)) (err ERR-MAX-ORDERS-EXCEEDED))
    (try! (validate-product-id product-id))
    (try! (validate-quantity quantity))
    (try! (validate-price price-per-unit))
    (try! (validate-seller seller))
    (try! (validate-location delivery-location))
    (try! (validate-currency currency))
    (try! (check-inventory product-id quantity))
    (try! (stx-transfer? fee-amount tx-sender (as-contract tx-sender)))
    (try! (call-escrow-deposit order-id net-amount))
    (map-set orders order-id
      {
        product-id: product-id,
        quantity: quantity,
        price-per-unit: price-per-unit,
        total-amount: total-amount,
        buyer: tx-sender,
        seller: seller,
        status: "pending",
        order-timestamp: block-height,
        ship-timestamp: none,
        delivery-timestamp: none,
        delivery-location: delivery-location,
        currency: currency
      }
    )
    (try! (call-supply-chain-update order-id "ordered"))
    (var-set next-order-id (+ order-id u1))
    (print { event: "order-placed", id: order-id })
    (ok order-id)
  )
)

(define-public (ship-order (order-id uint))
  (let ((order (unwrap! (map-get? orders order-id) (err ERR-ORDER-NOT-FOUND))))
    (asserts! (is-eq (get seller order) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status order) "pending") (err ERR-ORDER-NOT-PENDING))
    (map-set orders order-id (merge order { status: "shipped", ship-timestamp: (some block-height) }))
    (map-set order-updates order-id { update-status: "shipped", update-timestamp: block-height, updater: tx-sender })
    (try! (call-supply-chain-update order-id "shipped"))
    (print { event: "order-shipped", id: order-id })
    (ok true)
  )
)

(define-public (confirm-delivery (order-id uint))
  (let ((order (unwrap! (map-get? orders order-id) (err ERR-ORDER-NOT-FOUND))))
    (asserts! (is-eq (get buyer order) tx-sender) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status order) "shipped") (err ERR-ORDER-NOT-SHIPPED))
    (map-set orders order-id (merge order { status: "delivered", delivery-timestamp: (some block-height) }))
    (map-set order-updates order-id { update-status: "delivered", update-timestamp: block-height, updater: tx-sender })
    (try! (call-escrow-release order-id))
    (try! (call-supply-chain-update order-id "delivered"))
    (print { event: "order-delivered", id: order-id })
    (ok true)
  )
)

(define-public (cancel-order (order-id uint))
  (let ((order (unwrap! (map-get? orders order-id) (err ERR-ORDER-NOT-FOUND))))
    (asserts! (or (is-eq (get buyer order) tx-sender) (is-eq (get seller order) tx-sender)) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-eq (get status order) "pending") (err ERR-ORDER-NOT-PENDING))
    (map-set orders order-id (merge order { status: "cancelled" }))
    (map-set order-updates order-id { update-status: "cancelled", update-timestamp: block-height, updater: tx-sender })
    (try! (call-escrow-release order-id))
    (try! (call-supply-chain-update order-id "cancelled"))
    (print { event: "order-cancelled", id: order-id })
    (ok true)
  )
)

(define-public (get-order-status (order-id uint))
  (let ((order (map-get? orders order-id)))
    (match order o (ok (get status o)) (err ERR-ORDER-NOT-FOUND))
  )
)

(define-public (get-order-count)
  (ok (var-get next-order-id))
)