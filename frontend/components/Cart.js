import React from 'react';
import CartStyles from './styles/CartStyles';
import Supreme from './styles/Supreme';
import CloseButton from './styles/CloseButton';
import SickButton from './styles/SickButton';

const Cart = () => (
    <CartStyles open={true}>
        <header>
            <CloseButton title="Close">&times;</CloseButton>
            <Supreme>Your Cart</Supreme>
            <p>Your have __ items in your cart</p>
        </header>
        <footer>
            <p>$10.25</p>
            <SickButton>Checkout</SickButton>
        </footer>
    </CartStyles>
);

export default Cart;