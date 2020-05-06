import ItemComponent from '../components/Item';
import { shallow } from 'enzyme';

const fakeItem = {
    id: 'ABC123',
    title: 'A Cool Item',
    price: 5000,
    description: 'This item is really cool!',
    image: 'dog.jpg',
    largeImage: 'largedog.jpg',
};

describe('<Item/>', () => {
    it('renders the image properly', () => {
        const wrapper = shallow(<ItemComponent item={fakeItem} />);
        const img = wrapper.find('img');
        expect(img.props().src).toBe(fakeItem.image);
        expect(img.props().alt).toBe(fakeItem.title);
    });

    it('renders title and pricetag properly', () => {
        const wrapper = shallow(<ItemComponent item={fakeItem} />);
        expect(wrapper.find('Title a').text()).toBe(fakeItem.title);

        const PriceTag = wrapper.find('PriceTag');
        expect(PriceTag.children().text()).toBe('$50');
    });

    it('renders out the buttons properly', () => {
        const wrapper = shallow(<ItemComponent item={fakeItem} />);
        const buttonList = wrapper.find('.buttonList');
        expect(buttonList.children()).toHaveLength(3);
        expect(buttonList.find('Link').exists()).toBe(true);
        expect(buttonList.find('AddToCart').exists()).toBe(true);
        expect(buttonList.find('DeleteItem').exists()).toBe(true);
    });
});