import { mount } from 'enzyme';
import wait from 'waait';
import PleaseSignIn from '../components/PleaseSignIn';
import { CURRENT_USER_QUERY } from '../components/User';
import { MockedProvider } from 'react-apollo/test-utils';
import { fakeUser } from '../lib/testUtils';

const notSignedInMocks = [
    {
        request: { query: CURRENT_USER_QUERY },
        result: { data: { me: null } },
    },
];

const signedInMocks = [
    {
        request: { query: CURRENT_USER_QUERY },
        result: { data: { me: fakeUser() } },
    },
];

describe('<PleaseSignIn/>', () => {
    it('renders the sign in dialog if not signed in', async () => {
        const wrapper = mount(
            <MockedProvider mocks={notSignedInMocks}>
                <PleaseSignIn/>
            </MockedProvider>
        );
        await wait();
        wrapper.update();

        // contains expected tests
        expect(wrapper.text()).toContain('Please sign in before continuing');
        
        // renders signin component
        expect(wrapper.find('Signin').exists()).toBe(true);
    });

    it('renders the child component when the user is signed in', async () => {
        // PleaseSignIn child component
        const Hey = () => <p>Hey!</p>;

        const wrapper = mount(
            <MockedProvider mocks={signedInMocks}>
                <PleaseSignIn>
                    <Hey />
                </PleaseSignIn>
            </MockedProvider>
        );

        await wait();
        wrapper.update();

        // find child component
        expect(wrapper.contains(<Hey />)).toBe(true);
    })
});